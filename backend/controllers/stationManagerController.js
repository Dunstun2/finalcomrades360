const { Order, OrderItem, User, Warehouse, PickupStation, Product, FastFood, ReturnRequest, Service, DeliveryTask, Op } = require('../models');
const { getOrderSellerIds } = require('../utils/orderHelpers');

const STATION_VIEW_STATUSES = [
  'seller_confirmed',
  'super_admin_confirmed',
  'en_route_to_warehouse',
  'at_warehouse',
  'at_warehouse',
  'en_route_to_pick_station',
  'at_pick_station',
  'ready_for_pickup',
  'in_transit',
  'awaiting_delivery_assignment',
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'return_approved',
  'return_at_pick_station',
  'return_in_transit',
  'return_at_warehouse',
  'returned'
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

    const { status: filterStatus, viewAll, filter } = req.query;

    const where = {
      ...baseFilter
    };

    if (filter === 'total' || viewAll === 'true' || filterStatus === 'all' || filter === 'all') {
      // No status filter
    } else if (filter === 'active') {
      where.status = { [Op.in]: STATION_VIEW_STATUSES };
    } else if (filter === 'atStation') {
      where.status = stationUser.stationType === 'warehouse' 
        ? { [Op.in]: ['at_warehouse', 'at_warehouse', 'awaiting_delivery_assignment', 'processing', 'return_at_warehouse'] } 
        : { [Op.in]: ['at_pick_station', 'ready_for_pickup', 'return_at_pick_station'] };
    } else if (filter === 'enRoute') {
      where.status = stationUser.stationType === 'warehouse' 
        ? { [Op.in]: ['en_route_to_warehouse', 'seller_confirmed', 'super_admin_confirmed', 'return_approved'] } 
        : { [Op.in]: ['in_transit', 'en_route_to_pick_station', 'processing', 'awaiting_delivery_assignment', 'return_approved'] };
    } else if (filter === 'finalDestination') {
      where.status = stationUser.stationType === 'warehouse' 
        ? { [Op.in]: ['en_route_to_pick_station', 'in_transit', 'shipped', 'delivered', 'completed'] } 
        : { [Op.in]: ['delivered', 'completed'] };
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
        },
        {
          model: DeliveryTask,
          as: 'deliveryTasks',
          include: [{ model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }]
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 200
    });

    console.log(`[stationManagerController] Found ${orders.length} orders. First order items: ${orders[0]?.OrderItems?.length || 0}`);

    const totalShipments = await Order.count({ where: baseFilter });
    
    // Always calculate independently from fetched orders array
    let enRouteCount = 0;
    let atStationCount = 0;
    let finalDestinationCount = 0;
    
    if (stationUser.stationType === 'warehouse') {
      enRouteCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['en_route_to_warehouse', 'seller_confirmed', 'super_admin_confirmed', 'return_in_transit', 'return_approved'] } } });
      atStationCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['at_warehouse', 'at_warehouse', 'awaiting_delivery_assignment', 'processing', 'return_at_warehouse'] } } });
      finalDestinationCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['en_route_to_pick_station', 'in_transit', 'shipped', 'delivered', 'completed', 'returned'] } } });
    } else {
      enRouteCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['in_transit', 'en_route_to_pick_station', 'processing', 'awaiting_delivery_assignment', 'return_approved'] } } });
      atStationCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['at_pick_station', 'ready_for_pickup', 'return_at_pick_station'] } } });
      finalDestinationCount = await Order.count({ where: { ...baseFilter, status: { [Op.in]: ['delivered', 'completed', 'returned'] } } });
    }

    const totalReturns = stationUser.stationType === 'pickup_station'
      ? await ReturnRequest.count({ where: { pickupStationId: stationUser.stationId, pickupMethod: 'drop_off', status: { [Op.ne]: 'completed' } } })
      : await ReturnRequest.count({ 
          include: [{ 
            model: Order, 
            as: 'order', 
            where: { destinationWarehouseId: stationUser.stationId } 
          }],
          where: { status: { [Op.in]: ['approved', 'item_collected', 'at_pick_station', 'item_received'] } } 
        });

    const counts = {
      total: totalShipments,
      enRoute: enRouteCount,
      atStation: atStationCount,
      finalDestination: finalDestinationCount,
      returns: totalReturns
    };

    // --- FETCH RETURNS ---
    let returns = [];
    if (stationUser.stationType === 'pickup_station') {
      returns = await ReturnRequest.findAll({
        where: {
          pickupStationId: stationUser.stationId,
          pickupMethod: 'drop_off',
          status: { [Op.in]: ['pending', 'approved', 'at_pick_station'] }
        },
        include: [
          { 
            model: Order, 
            as: 'order',
            include: [
              {
                model: OrderItem,
                as: 'OrderItems',
                separate: true,
                attributes: ['id', 'name', 'quantity', 'price', 'itemType'],
                include: [
                  { model: Product, attributes: ['id', 'name', 'coverImage'] },
                  { model: FastFood, attributes: ['id', 'name', 'mainImage'] }
                ]
              },
              {
                model: DeliveryTask,
                as: 'deliveryTasks',
                include: [{ model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }]
              }
            ]
          },
          { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    return res.json({
      success: true,
      station: {
        stationType: stationUser.stationType,
        stationId: stationUser.stationId,
        stationName: stationUser.stationName,
        stationCode: stationUser.stationCode || null
      },
      counts,
      orders,
      returns
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

    const allowedStatuses = ['en_route_to_warehouse'];
    if (order.status === 'at_warehouse') {
      return res.json({
        success: true,
        message: 'Order is already marked as received at warehouse.',
        order
      });
    }
    
    const validInboundLeg = ['seller_to_warehouse', 'customer_to_warehouse', 'warehouse_to_seller'].includes(order.deliveryType || '');
    if (!allowedStatuses.includes(order.status) || !validInboundLeg) {
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

    const allowedStatuses = ['en_route_to_pick_station', 'at_pick_station'];
    if (order.status === 'ready_for_pickup') {
      return res.json({
        success: true,
        message: 'Order is already marked as ready for pickup.',
        order
      });
    }

    const validToStationLeg = ['seller_to_pickup_station', 'warehouse_to_pickup_station'].includes(order.deliveryType || '');
    if (!allowedStatuses.includes(order.status) || !validToStationLeg) {
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

const markReturnReceivedAtStation = async (req, res) => {
  try {
    const stationUser = req.user;
    if (stationUser.stationType !== 'pickup_station') {
      return res.status(403).json({ success: false, message: 'Only pick station managers can perform this action.' });
    }

    const { returnId } = req.params;
    const returnReq = await ReturnRequest.findByPk(returnId, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found.' });
    }

    if (returnReq.pickupStationId !== stationUser.stationId) {
      return res.status(403).json({ success: false, message: 'This return does not belong to your pick station.' });
    }

    if (returnReq.status === 'at_pick_station') {
      return res.json({ success: true, message: 'Return already marked as received.', returnRequest: returnReq });
    }

    const status = 'at_pick_station';
    await returnReq.update({ status });

    if (returnReq.order) {
      await returnReq.order.update({ status: 'return_at_pick_station' });
      
      await appendStationActivity(returnReq.order, {
        status: 'return_received_at_station',
        stationUser,
        message: 'Return item dropped off by customer and received at pickup station.'
      });

      await emitStationStatusUpdate(returnReq.order, 'return_at_pick_station');
    }

    return res.json({
      success: true,
      message: 'Return received successfully. It is now awaiting collection for warehouse transfer.',
      returnRequest: returnReq
    });
  } catch (error) {
    console.error('[stationManagerController] markReturnReceivedAtStation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark return received.' });
  }
};

/**
 * POST /api/station-manager/returns/:returnId/receive-warehouse
 * Warehouse manager confirms receipt of a return from an agent or customer.
 */
const markReturnReceivedAtWarehouse = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { stationId, stationType } = req.user;

    if (stationType !== 'warehouse') {
      return res.status(403).json({ success: false, message: 'Only warehouse managers can confirm warehouse receipt.' });
    }

    const returnReq = await ReturnRequest.findByPk(returnId, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!returnReq) return res.status(404).json({ success: false, message: 'Return request not found.' });
    
    // Check if the order is destined for this warehouse
    if (returnReq.order?.destinationWarehouseId !== stationId && returnReq.order?.warehouseId !== stationId) {
      return res.status(403).json({ success: false, message: 'This return is not destined for this warehouse.' });
    }

    const t = await Order.sequelize.transaction();
    try {
      await returnReq.update({
        status: 'item_received',
        adminNotes: `${returnReq.adminNotes || ''}\n[${new Date().toISOString()}] Received at Warehouse ${stationId}`
      }, { transaction: t });

      await Order.update({ 
        status: 'return_at_warehouse',
        returnStatus: 'approved' // Ensure it's still approved
      }, { 
        where: { id: returnReq.orderId },
        transaction: t 
      });

      // Find and complete the delivery task
      const task = await DeliveryTask.findOne({
        where: { 
          orderId: returnReq.orderId,
          deliveryType: { [Op.like]: '%to_warehouse%' },
          status: { [Op.ne]: 'completed' }
        },
        transaction: t
      });

      if (task) {
        await task.update({
          status: 'completed',
          actualDelivery: new Date(),
          notes: `${task.notes || ''}\nDelivered to warehouse.`
        }, { transaction: t });
      }

      await t.commit();
      res.json({ success: true, message: 'Return received at warehouse successfully.' });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (e) {
    console.error('Error in markReturnReceivedAtWarehouse:', e);
    res.status(500).json({ success: false, message: 'Failed to confirm warehouse receipt.' });
  }
};

module.exports = {
  getStationDashboard,
  markOrderReceivedAtWarehouse,
  markOrderReadyAtPickupStation,
  markReturnReceivedAtStation,
  markReturnReceivedAtWarehouse
};
