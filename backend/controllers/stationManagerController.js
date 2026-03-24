const { Order, OrderItem, User, Warehouse, PickupStation, Product, FastFood, Service, Op } = require('../models');
const { getOrderSellerIds } = require('../utils/orderHelpers');

const STATION_VIEW_STATUSES = [
  'super_admin_confirmed',
  'seller_confirmed',
  'en_route_to_warehouse',
  'at_warehouse',
  'ready_for_pickup',
  'in_transit'
];

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

const appendStationActivity = async (order, { status, message, stationUser }) => {
  const trackingUpdates = parseJsonArray(order.trackingUpdates);
  trackingUpdates.push({
    status,
    message,
    timestamp: new Date().toISOString(),
    updatedBy: stationUser.id,
    updatedByRole: stationUser.role,
    stationType: stationUser.stationType,
    stationId: stationUser.stationId,
    stationName: stationUser.stationName
  });

  const communicationLog = parseJsonArray(order.communicationLog);
  communicationLog.push({
    sender: 'station_manager',
    senderRole: stationUser.role,
    senderName: stationUser.stationName || stationUser.name || 'Station Manager',
    stationType: stationUser.stationType,
    stationId: stationUser.stationId,
    message,
    timestamp: new Date().toISOString()
  });

  await order.update({
    trackingUpdates: JSON.stringify(trackingUpdates),
    communicationLog: JSON.stringify(communicationLog)
  });
};

const emitStationStatusUpdate = async (order, status) => {
  const { getIO } = require('../realtime/socket');
  const io = getIO();
  if (!io) return;

  const payload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
    updatedBy: 'station_manager'
  };

  io.to(`user:${order.userId}`).emit('orderStatusUpdate', payload);
  io.to('admin').emit('orderStatusUpdate', payload);

  const sellerIds = await getOrderSellerIds(order.id);
  sellerIds.forEach((sellerId) => {
    io.to(`user:${sellerId}`).emit('orderStatusUpdate', payload);
  });
};

const getStationOrderFilter = (stationUser) => {
  const { Op } = require('sequelize');
  if (stationUser.stationType === 'warehouse') {
    return {
      [Op.or]: [
        { destinationWarehouseId: stationUser.stationId },
        { warehouseId: stationUser.stationId }
      ]
    };
  }

  if (stationUser.stationType === 'pickup_station') {
    return {
      [Op.or]: [
        { destinationPickStationId: stationUser.stationId },
        { pickupStationId: stationUser.stationId }
      ]
    };
  }

  return null;
};

const getStationDashboard = async (req, res) => {
  try {
    const stationUser = req.user;
    const baseFilter = getStationOrderFilter(stationUser);

    if (!baseFilter) {
      return res.status(400).json({ success: false, message: 'Unsupported station type.' });
    }

    const { status: filterStatus, viewAll } = req.query;

    const where = {
      ...baseFilter
    };

    if (viewAll === 'true' || filterStatus === 'all') {
      // No status filter
    } else if (filterStatus) {
      where.status = filterStatus;
    } else {
      where.status = { [Op.in]: STATION_VIEW_STATUSES };
    }

    console.log(`[stationManagerController] Loading dashboard for station: ${stationUser.stationId}, type: ${stationUser.stationType}`);
    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'businessName'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'businessAddress', 'phone', 'businessName'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['name', 'address', 'landmark'] },
        { model: PickupStation, as: 'PickupStation', attributes: ['name', 'location'] },
        {
          model: OrderItem,
          as: 'OrderItems',
          separate: true,
          attributes: ['id', 'name', 'quantity', 'price', 'deliveryFee', 'itemType', 'basePrice'],
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'coverImage', 'images', 'galleryImages'],
              required: false
            },
            {
              model: FastFood,
              attributes: ['id', 'name', 'mainImage', 'galleryImages'],
              required: false
            },
            {
              model: Service,
              attributes: ['id', 'title'],
              required: false
            },
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'businessAddress', 'phone', 'businessName']
            }
          ]
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 200
    });

    console.log(`[stationManagerController] Found ${orders.length} orders. First order items: ${orders[0]?.OrderItems?.length || 0}`);

    const counts = {
      total: orders.length,
      enRouteToWarehouse: orders.filter(o => o.status === 'en_route_to_warehouse').length,
      atWarehouse: orders.filter(o => o.status === 'at_warehouse').length,
      readyForPickup: orders.filter(o => o.status === 'ready_for_pickup').length
    };

    return res.json({
      success: true,
      station: {
        stationType: stationUser.stationType,
        stationId: stationUser.stationId,
        stationName: stationUser.stationName,
        stationCode: stationUser.stationCode || null
      },
      counts,
      orders
    });
  } catch (error) {
    console.error('[stationManagerController] getStationDashboard error:', error);
    // Log additional details if it's a Sequelize error
    if (error.name === 'SequelizeDatabaseError') {
      console.error('[stationManagerController] SQL:', error.sql);
      console.error('[stationManagerController] Message:', error.message);
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load station dashboard.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const markOrderReceivedAtWarehouse = async (req, res) => {
  try {
    const stationUser = req.user;
    if (stationUser.stationType !== 'warehouse') {
      return res.status(403).json({ success: false, message: 'Only warehouse station managers can perform this action.' });
    }

    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.destinationWarehouseId !== stationUser.stationId) {
      return res.status(403).json({ success: false, message: 'This order does not belong to your warehouse.' });
    }

    const allowedStatuses = ['en_route_to_warehouse', 'super_admin_confirmed', 'seller_confirmed', 'in_transit'];
    if (order.status === 'at_warehouse') {
      return res.json({
        success: true,
        message: 'Order is already marked as received at warehouse.',
        order
      });
    }
    
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order cannot be marked at warehouse from status ${order.status}.` });
    }

    const status = 'at_warehouse';
    await order.update({
      status,
      warehouseId: order.destinationWarehouseId || order.warehouseId,
      warehouseArrivalDate: new Date(),
      deliveryType: null, // Clear the previous routing leg
      deliveryAgentId: null // Clear previous agent
    });

    // Also close out any active delivery tasks for this leg
    const { DeliveryTask, Op } = require('../models');
    await DeliveryTask.update(
      { 
        status: 'completed', 
        completedAt: new Date(),
        agentNotes: 'Auto-completed via Station Manager manual receive.'
      },
      { 
        where: { 
          orderId: order.id, 
          status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] } 
        } 
      }
    );

    await appendStationActivity(order, {
      status,
      stationUser,
      message: 'Order received at warehouse by station manager.'
    });

    await emitStationStatusUpdate(order, status);

    return res.json({
      success: true,
      message: 'Order marked as received at warehouse. The delivery agent\'s task was automatically marked complete.',
      order
    });
  } catch (error) {
    console.error('[stationManagerController] markOrderReceivedAtWarehouse error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark order at warehouse.' });
  }
};

const markOrderReadyAtPickupStation = async (req, res) => {
  try {
    const stationUser = req.user;
    if (stationUser.stationType !== 'pickup_station') {
      return res.status(403).json({ success: false, message: 'Only pick station managers can perform this action.' });
    }

    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.destinationPickStationId !== stationUser.stationId) {
      return res.status(403).json({ success: false, message: 'This order does not belong to your pick station.' });
    }

    const allowedStatuses = ['at_warehouse', 'en_route_to_warehouse', 'super_admin_confirmed', 'seller_confirmed'];
    if (order.status === 'ready_for_pickup') {
      return res.json({
        success: true,
        message: 'Order is already marked as ready for pickup.',
        order
      });
    }

    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order cannot be marked ready for pickup from status ${order.status}.` });
    }

    const status = 'ready_for_pickup';
    await order.update({
      status,
      pickupStationId: order.destinationPickStationId || order.pickupStationId,
      deliveryType: null, // Clear the previous routing leg
      deliveryAgentId: null // Clear previous agent
    });

    // Also close out any active delivery tasks for this leg
    const { DeliveryTask, Op } = require('../models');
    await DeliveryTask.update(
      { 
        status: 'completed', 
        completedAt: new Date(),
        agentNotes: 'Auto-completed via Station Manager manual receive.'
      },
      { 
        where: { 
          orderId: order.id, 
          status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] } 
        } 
      }
    );

    await appendStationActivity(order, {
      status,
      stationUser,
      message: 'Order marked ready for pickup by station manager.'
    });

    await emitStationStatusUpdate(order, status);

    return res.json({
      success: true,
      message: 'Order marked as ready for pickup. The delivery agent\'s task was automatically marked complete.',
      order
    });
  } catch (error) {
    console.error('[stationManagerController] markOrderReadyAtPickupStation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark order ready for pickup.' });
  }
};

module.exports = {
  getStationDashboard,
  markOrderReceivedAtWarehouse,
  markOrderReadyAtPickupStation
};
