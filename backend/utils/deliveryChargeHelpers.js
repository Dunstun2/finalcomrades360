const SELLER_PAID_ROUTE_TYPES = new Set([
  'seller_to_warehouse',
  'seller_to_pickup_station',
  'warehouse_to_seller',
  'pickup_station_to_seller',
  'customer_to_seller'
]);

const CUSTOMER_PAID_ROUTE_TYPES = new Set([
  'seller_to_customer',
  'warehouse_to_customer',
  'pickup_station_to_customer',
  'warehouse_to_pickup_station',
  'customer_to_pickup_station',
  'customer_to_warehouse',
  'fastfood_pickup_point',
  'last_mile'
]);

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

// Import models for fallback if not passed as dependencies
const models = require('../models');

const calculateSellerMerchandisePayout = (order, orderItems = []) => {
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    return roundMoney(orderItems.reduce((sum, item) => sum + Number(item.total || 0), 0));
  }

  return roundMoney(Math.max(0, Number(order?.total || 0) - Number(order?.deliveryFee || 0)));
};

const isFastFoodOrder = (order) => {
  if (!order) return false;
  if (['direct_delivery', 'fastfood_pickup_point'].includes(order.adminRoutingStrategy)) {
    return true;
  }
  if (Array.isArray(order.OrderItems) && order.OrderItems.some(item => !!item.fastFoodId || item.itemType === 'fastfood')) {
    return true;
  }
  return false;
};

const getRoutePayer = (order, routeType) => {
  if (isFastFoodOrder(order)) {
    return {
      payerType: 'customer',
      payerUserId: order?.userId || null,
      fundingSource: 'order_delivery_fee',
      note: 'Customer-funded Fast Food delivery leg.'
    };
  }

  if (SELLER_PAID_ROUTE_TYPES.has(routeType)) {
    return {
      payerType: 'seller',
      payerUserId: order?.sellerId || null,
      fundingSource: 'seller_wallet',
      note: 'Seller-funded first-mile or reverse logistics leg.'
    };
  }

  if (CUSTOMER_PAID_ROUTE_TYPES.has(routeType)) {
    return {
      payerType: 'customer',
      payerUserId: order?.userId || null,
      fundingSource: 'order_delivery_fee',
      note: 'Customer-funded downstream delivery leg.'
    };
  }

  return {
    payerType: 'platform',
    payerUserId: null,
    fundingSource: 'platform',
    note: 'Platform-funded internal or fallback logistics leg.'
  };
};

const upsertDeliveryChargeForTask = async ({
  DeliveryCharge = models.DeliveryCharge,
  PlatformConfig = models.PlatformConfig,
  transaction,
  order,
  task,
  deliveryFee,
  agentSharePercent,
  deliveryType,
  deliveryAgentId
}) => {
  const existingCharge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: task.id },
    transaction
  });

  // 1. Fetch relevant configurations
  const [stationShareConfig, handlingFeeConfig, directAgentShareConfig] = await Promise.all([
    PlatformConfig.findOne({ where: { key: 'delivery_fee_station_share' }, transaction }),
    PlatformConfig.findOne({ where: { key: 'seller_delivery_handling_fee' }, transaction }),
    PlatformConfig.findOne({ where: { key: 'direct_delivery_agent_share' }, transaction })
  ]);

  const stationSharePercent = stationShareConfig ? parseFloat(stationShareConfig.value) : 10;
  const handlingFeePercent = handlingFeeConfig ? parseFloat(handlingFeeConfig.value) : 20;
  const directAgentSharePercent = directAgentShareConfig ? parseFloat(directAgentShareConfig.value) : 80;

  const grossAmount = roundMoney(deliveryFee);
  let sharePercent = roundMoney(agentSharePercent);
  
  let agentAmount = 0;
  let stationAmount = 0;
  let platformAmount = 0;
  
  let stationId = null;
  let stationType = null;

  // 2. Identify Hub (Warehouse or Pickup Station)
  if (deliveryType.includes('warehouse')) {
    stationId = order.destinationWarehouseId || order.warehouseId;
    stationType = 'warehouse';
  } else if (deliveryType.includes('pickup_station') || deliveryType.includes('pick_station') || deliveryType === 'fastfood_pickup_point') {
    stationId = order.destinationPickStationId || order.pickupStationId || order.destinationFastFoodPickupPointId;
    stationType = 'pickup_station';
  }

  // 3. Calculate Splits
  // 3. Calculate Splits
  const routeFunding = getRoutePayer(order, deliveryType);

  if (routeFunding.payerType === 'customer') {
    // 3-Way Split for Customer-Paid Legs (Agent, Station, Platform)
    agentAmount = roundMoney(grossAmount * (sharePercent / 100));
    
    if (stationId) {
      stationAmount = roundMoney(grossAmount * (stationSharePercent / 100));
    } else {
      stationAmount = 0;
    }
    
    platformAmount = roundMoney(grossAmount - agentAmount - stationAmount);
  } else if (routeFunding.payerType === 'seller') {
    // Platform Share logic for Seller-Paid Legs (First-Mile)
    // handlingFeePercent now represents the Platform's cut
    platformAmount = roundMoney(grossAmount * (handlingFeePercent / 100));
    
    // Agent still gets their standard share
    agentAmount = roundMoney(grossAmount * (sharePercent / 100));
    
    // Station receives the remainder
    if (stationId) {
      stationAmount = roundMoney(Math.max(0, grossAmount - agentAmount - platformAmount));
    } else {
      stationAmount = 0;
      // If no station, platform absorbs the remainder
      platformAmount = roundMoney(grossAmount - agentAmount);
    }
  } else {
    // Platform funded or unknown - Fallback to standard 2-way split
    agentAmount = roundMoney(grossAmount * (sharePercent / 100));
    platformAmount = roundMoney(grossAmount - agentAmount);
  }

  const sellerMerchandisePayout = calculateSellerMerchandisePayout(order, order?.OrderItems);
  const isCustomerChargeCaptured = routeFunding.payerType === 'customer' && !!order?.paymentConfirmed;
  const existingCharged = roundMoney(existingCharge?.chargedAmount || 0);
  const chargedAmount = roundMoney(isCustomerChargeCaptured ? grossAmount : Math.min(existingCharged, grossAmount));
  const outstandingAmount = roundMoney(Math.max(0, grossAmount - chargedAmount));

  const payload = {
    orderId: order.id,
    deliveryTaskId: task.id,
    routeType: deliveryType,
    payerType: routeFunding.payerType,
    payerUserId: routeFunding.payerUserId,
    payeeUserId: deliveryAgentId || task.deliveryAgentId || null,
    grossAmount,
    chargedAmount,
    outstandingAmount,
    agentSharePercent: sharePercent,
    agentAmount,
    platformAmount,
    stationAmount,
    stationId,
    stationType,
    sellerMerchandisePayout,
    fundingSource: routeFunding.fundingSource,
    fundingStatus: isCustomerChargeCaptured ? 'charged' : (outstandingAmount <= 0 ? 'charged' : 'quoted'),
    quotedAt: new Date(),
    invoicedAt: routeFunding.payerType === 'seller' ? new Date() : existingCharge?.invoicedAt || null,
    chargedAt: isCustomerChargeCaptured ? new Date() : null,
    note: routeFunding.note
  };

  const chargeData = {
    ...payload,
    deliveryTaskId: task.id
  };

  // Sync back to DeliveryTask to ensure UI (DeliveryTaskConsole) has the persisted earnings
  if (task && task.update) {
    await task.update({
      deliveryFee: grossAmount,
      agentShare: sharePercent,
      agentEarnings: agentAmount
    }, { transaction });
  }

  if (existingCharge) {
    await existingCharge.update(chargeData, { transaction });
    return existingCharge;
  }

  const doubleCheck = await DeliveryCharge.findOne({
    where: { deliveryTaskId: task.id },
    transaction
  });

  if (doubleCheck) {
    await doubleCheck.update(chargeData, { transaction });
    return doubleCheck;
  }

  return DeliveryCharge.create(chargeData, { transaction });
};

const invoiceSellerChargeImmediately = async ({
  DeliveryCharge = models.DeliveryCharge,
  Wallet = models.Wallet,
  Transaction = models.Transaction,
  transaction,
  task,
  order
}) => {
  const charge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: task.id },
    transaction
  });

  if (!charge || charge.payerType !== 'seller' || !charge.payerUserId) {
    return charge;
  }

  const outstanding = roundMoney(charge.outstandingAmount || 0);
  if (outstanding <= 0) return charge;

  let sellerWallet = await Wallet.findOne({ where: { userId: charge.payerUserId }, transaction });
  if (!sellerWallet) {
    sellerWallet = await Wallet.create({ userId: charge.payerUserId, balance: 0, pendingBalance: 0, successBalance: 0 }, { transaction });
  }

  const walletBalance = roundMoney(sellerWallet.balance || 0);
  const amountToDebit = roundMoney(Math.min(walletBalance, outstanding));

  if (amountToDebit > 0) {
    await sellerWallet.update({
      balance: roundMoney(walletBalance - amountToDebit)
    }, { transaction });

    await Transaction.create({
      userId: charge.payerUserId,
      amount: amountToDebit,
      type: 'debit',
      status: 'completed',
      description: `Delivery Invoice (${task.deliveryType}) for Order #${order.orderNumber}`,
      orderId: order.id
    }, { transaction });
  }

  const chargedAmount = roundMoney((charge.chargedAmount || 0) + amountToDebit);
  const updatedOutstanding = roundMoney(Math.max(0, charge.grossAmount - chargedAmount));

  await charge.update({
    chargedAmount,
    outstandingAmount: updatedOutstanding,
    fundingStatus: updatedOutstanding <= 0 ? 'charged' : 'quoted',
    invoicedAt: charge.invoicedAt || new Date(),
    chargedAt: amountToDebit > 0 ? new Date() : charge.chargedAt,
    note: updatedOutstanding > 0
      ? `Seller invoice partially funded from wallet. Outstanding ${updatedOutstanding}.`
      : 'Seller invoice fully funded from wallet.'
  }, { transaction });

  return charge;
};

const settleDeliveryChargeForTask = async ({ DeliveryCharge = models.DeliveryCharge, transaction, taskId, markCharged = false }) => {
  const charge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: taskId },
    transaction
  });

  if (!charge) return null;
  if (charge.fundingStatus === 'settled') return charge;

  await charge.update({
    fundingStatus: 'settled',
    chargedAt: markCharged && !charge.chargedAt ? new Date() : charge.chargedAt,
    settledAt: new Date()
  }, { transaction });

  return charge;
};

module.exports = {
  SELLER_PAID_ROUTE_TYPES,
  CUSTOMER_PAID_ROUTE_TYPES,
  calculateSellerMerchandisePayout,
  getRoutePayer,
  upsertDeliveryChargeForTask,
  invoiceSellerChargeImmediately,
  settleDeliveryChargeForTask
};