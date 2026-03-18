const { Order, OrderItem, Product, FastFood, User, Warehouse, PickupStation, FastFoodPickupPoint } = require('../models');
const { Op } = require('sequelize');

const PRODUCT_ROUTING_STRATEGIES = ['warehouse', 'pick_station', 'direct_delivery'];
const FASTFOOD_ROUTING_STRATEGIES = ['direct_delivery', 'fastfood_pickup_point'];

/**
 * Analyze order composition to determine seller count and delivery eligibility
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeOrderComposition(orderId) {
  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  const orderItems = await OrderItem.findAll({
    where: { orderId }
  });

  order.OrderItems = orderItems || [];

  // Collect unique seller IDs from order items
  const sellerIds = new Set();
  
  order.OrderItems.forEach(item => {
    const sellerId = item.sellerId || item.Product?.sellerId || item.FastFood?.vendor;
    if (sellerId) {
      sellerIds.add(sellerId);
    }
  });

  const uniqueSellerIds = Array.from(sellerIds);
  const isSingleSeller = uniqueSellerIds.length === 1;
  const isMultiSeller = uniqueSellerIds.length > 1;
  const hasFastFoodItems = (order.OrderItems || []).some(item => !!item.fastFoodId);
  const hasNonFastFoodItems = (order.OrderItems || []).some(item => !!item.productId || !!item.serviceId);
  const isFastFoodOnlyOrder = hasFastFoodItems && !hasNonFastFoodItems;
  const isMixedOrder = hasFastFoodItems && hasNonFastFoodItems;
  const orderCategory = isMixedOrder ? 'mixed' : (isFastFoodOnlyOrder ? 'fastfood' : 'product');
  
  // Check if customer requested home delivery
  const isHomeDelivery = order.deliveryMethod === 'home_delivery';
  const isPickStation = order.deliveryMethod === 'pick_station';

  // Direct delivery is eligible only if:
  // - Single seller order
  // - Customer requested home delivery
  const directDeliveryEligible = !isMixedOrder && (isFastFoodOnlyOrder || (isSingleSeller && isHomeDelivery));
  const allowedRoutingStrategies = isMixedOrder
    ? []
    : (isFastFoodOnlyOrder ? FASTFOOD_ROUTING_STRATEGIES : PRODUCT_ROUTING_STRATEGIES);
  const defaultRoutingStrategy = isMixedOrder
    ? null
    : (isFastFoodOnlyOrder
      ? (isPickStation ? 'fastfood_pickup_point' : 'direct_delivery')
      : (isPickStation ? 'pick_station' : 'direct_delivery'));
  const routingBlockedReason = isMixedOrder
    ? 'This order contains both product and fastfood items. Routing must be handled after the order is separated by type.'
    : null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    sellerCount: uniqueSellerIds.length,
    sellerIds: uniqueSellerIds,
    isSingleSeller,
    isMultiSeller,
    isFastFoodOnlyOrder,
    isMixedOrder,
    hasFastFoodItems,
    hasNonFastFoodItems,
    orderCategory,
    deliveryMethod: order.deliveryMethod,
    isHomeDelivery,
    isPickStation,
    directDeliveryEligible,
    allowedRoutingStrategies,
    defaultRoutingStrategy,
    routingBlockedReason,
    deliveryAddress: order.deliveryAddress,
    pickStation: order.pickStation,
    pickStationId: order.pickupStationId,
    currentStatus: order.status
  };
}

/**
 * Get all seller IDs involved in an order (for notifications/authorization)
 * @param {number} orderId - Order ID
 * @returns {Promise<Array<number>>} Array of seller user IDs
 */
async function getOrderSellerIds(orderId) {
  const items = await OrderItem.findAll({
    where: { orderId },
    include: [
      { model: Product, attributes: ['sellerId'] },
      { model: FastFood, attributes: ['vendor'] }
    ]
  });

  const sellerIds = new Set();
  
  items.forEach(item => {
    const sellerId = item.sellerId || item.Product?.sellerId || item.FastFood?.vendor;
    if (sellerId) {
      sellerIds.add(sellerId);
    }
  });

  return Array.from(sellerIds);
}

/**
 * Check if a user is a seller for any item in an order
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID to check
 * @returns {Promise<boolean>} True if user is a seller for this order
 */
async function isUserSellerForOrder(orderId, userId) {
  const sellerIds = await getOrderSellerIds(orderId);
  return sellerIds.includes(userId);
}

/**
 * Get destination details based on admin routing strategy
 * @param {Object} order - Order instance with routing fields
 * @returns {Promise<Object>} Destination details
 */
async function getDestinationDetails(order) {
  if (!order.adminRoutingStrategy) {
    return null;
  }

  let destination = null;
  
  if (order.adminRoutingStrategy === 'warehouse' && order.destinationWarehouseId) {
    destination = await Warehouse.findByPk(order.destinationWarehouseId);
    return {
      type: 'warehouse',
      id: destination?.id,
      name: destination?.name,
      address: destination?.address,
      contactPhone: destination?.contactPhone,
      landmark: destination?.landmark
    };
  }

  if (order.adminRoutingStrategy === 'pick_station' && order.destinationPickStationId) {
    destination = await PickupStation.findByPk(order.destinationPickStationId);
    return {
      type: 'pick_station',
      id: destination?.id,
      name: destination?.name,
      address: destination?.location,
      contactPhone: destination?.contactPhone
    };
  }

  if (order.adminRoutingStrategy === 'fastfood_pickup_point' && order.destinationFastFoodPickupPointId) {
    destination = await FastFoodPickupPoint.findByPk(order.destinationFastFoodPickupPointId);
    return {
      type: 'fastfood_pickup_point',
      id: destination?.id,
      name: destination?.name,
      address: destination?.address,
      contactPhone: destination?.contactPhone
    };
  }

  if (order.adminRoutingStrategy === 'direct_delivery') {
    return {
      type: 'direct_delivery',
      address: order.deliveryAddress,
      customerName: order.customerName,
      customerPhone: order.customerPhone
    };
  }

  return null;
}

/**
 * Validate admin routing selection
 * @param {string} strategy - Routing strategy
 * @param {Object} order - Order instance
 * @param {number|null} warehouseId - Warehouse ID (if strategy is warehouse)
 * @param {number|null} pickStationId - Pick station ID (if strategy is pick_station)
 * @param {number|null} fastFoodPickupPointId - Fastfood pickup point ID (if strategy is fastfood_pickup_point)
 * @returns {Promise<Object>} Validation result
 */
async function validateRoutingSelection(strategy, order, warehouseId = null, pickStationId = null, fastFoodPickupPointId = null) {
  const errors = [];

  // Analyze order composition
  const analysis = await analyzeOrderComposition(order.id);

  if (analysis.isMixedOrder) {
    errors.push(analysis.routingBlockedReason || 'Mixed product and fastfood orders are not supported for routing.');
  }

  if (!analysis.allowedRoutingStrategies.includes(strategy)) {
    errors.push(`Routing strategy "${strategy}" is not allowed for this order type.`);
  }

  // Validate direct delivery eligibility
  if (strategy === 'direct_delivery') {
    if (!analysis.directDeliveryEligible) {
      if (!analysis.isSingleSeller) {
        errors.push('Direct delivery is only available for single-seller orders');
      }
      if (!analysis.isHomeDelivery) {
        errors.push('Direct delivery is only available for home delivery orders');
      }
    }
  }

  // Validate warehouse selection
  if (strategy === 'warehouse') {
    if (!warehouseId) {
      errors.push('Warehouse must be selected for warehouse routing');
    } else {
      const warehouse = await Warehouse.findByPk(warehouseId);
      if (!warehouse || !warehouse.isActive) {
        errors.push('Selected warehouse is not available');
      }
    }
  }

  // Validate pick station selection
  if (strategy === 'pick_station') {
    if (!pickStationId) {
      errors.push('Pick station must be selected for pick station routing');
    } else {
      const station = await PickupStation.findByPk(pickStationId);
      if (!station || !station.isActive) {
        errors.push('Selected pick station is not available');
      }
    }
  }

  if (strategy === 'fastfood_pickup_point') {
    if (!analysis.isFastFoodOnlyOrder) {
      errors.push('Fastfood pickup point is only available for fastfood-only orders.');
    }

    if (!fastFoodPickupPointId) {
      errors.push('Fastfood pickup point must be selected for this routing strategy.');
    } else {
      const point = await FastFoodPickupPoint.findByPk(fastFoodPickupPointId);
      if (!point || point.isActive === false) {
        errors.push('Selected fastfood pickup point is not available.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    analysis
  };
}

module.exports = {
  analyzeOrderComposition,
  getOrderSellerIds,
  isUserSellerForOrder,
  getDestinationDetails,
  validateRoutingSelection
};
