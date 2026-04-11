const { ReturnRequest, Order, OrderItem, User, DeliveryTask, PickupStation, Product, FastFood, Refund, sequelize, Op } = require('../models');

/**
 * POST /api/returns/request
 * Customer requests a return for a delivered order.
 */
const requestReturn = async (req, res) => {
    try {
        const { orderId, items, reasonCategory, description, images, pickupMethod, pickupAddress, pickupStationId } = req.body;
        const userId = req.user.id;

        // 1. Validate Order
        const order = await Order.findByPk(orderId, {
            include: [{ model: OrderItem, as: 'OrderItems' }]
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'Access denied' });
        if (order.status !== 'delivered' && order.status !== 'completed') {
            return res.status(400).json({ error: 'Only delivered orders can be returned' });
        }

        // 2. Check Return Window (e.g., 7 days)
        const deliveryDate = order.actualDelivery || order.updatedAt;
        const diffDays = Math.ceil(Math.abs(Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
            return res.status(400).json({ error: 'Return window (7 days) has expired for this order.' });
        }

        // 3. Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item must be selected for return' });
        }

        // 4. Create ReturnRequest record
        const t = await sequelize.transaction();
        try {
            const returnRequest = await ReturnRequest.create({
                orderId,
                userId,
                sellerId: order.sellerId,
                items,
                reasonCategory,
                description,
                images,
                pickupMethod,
                pickupAddress,
                pickupStationId,
                status: 'pending'
            }, { transaction: t });

            // Update Order returnStatus AND status
            await order.update({ 
                returnStatus: 'requested',
                status: 'return_in_progress' 
            }, { transaction: t });

            // Update OrderItems returnStatus
            for (const item of items) {
                const orderItem = order.OrderItems.find(oi => oi.id === item.orderItemId);
                if (orderItem) {
                    await orderItem.update({ returnStatus: 'requested' }, { transaction: t });
                }
            }

            await t.commit();

            // TODO: Notify admins/seller
            
            res.status(201).json({ message: 'Return request submitted successfully', returnRequest });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in requestReturn:', e);
        res.status(500).json({ error: 'Failed to submit return request' });
    }
};

/**
 * Helper to enrich return requests with full item details (names, prices, images)
 * from the associated OrderItems.
 */
const enrichReturnRequests = async (returns) => {
    if (!returns || returns.length === 0) return [];

    // 1. Collect all orderItemIds across all returns
    const allItemIds = new Set();
    returns.forEach(ret => {
        const items = Array.isArray(ret.items) ? ret.items : [];
        items.forEach(i => {
            if (i.orderItemId) allItemIds.add(i.orderItemId);
        });
    });

    if (allItemIds.size === 0) return returns;

    // 2. Fetch all relevant OrderItems with their Product/FastFood details
    const orderItems = await OrderItem.findAll({
        where: { id: { [Op.in]: Array.from(allItemIds) } },
        include: [
            { model: Product, attributes: ['id', 'name', 'coverImage'] },
            { model: FastFood, attributes: ['id', 'name', 'mainImage'] }
        ]
    });

    const itemMap = new Map(orderItems.map(oi => [oi.id, oi]));

    // 3. Map enriched data back to each return request
    return returns.map(ret => {
        const plainRet = ret.get({ plain: true });
        const items = Array.isArray(plainRet.items) ? plainRet.items : [];
        
        plainRet.items = items.map(item => {
            const dbItem = itemMap.get(item.orderItemId);
            if (!dbItem) return item;

            return {
                ...item,
                name: dbItem.itemLabel || dbItem.name,
                price: dbItem.price,
                image: dbItem.Product?.coverImage || dbItem.FastFood?.mainImage || null,
                returnedQuantity: dbItem.returnedQuantity
            };
        });

        return plainRet;
    });
};

/**
 * GET /api/returns/my-returns
 * List returns for the current customer.
 */
const listMyReturns = async (req, res) => {
    try {
        const returns = await ReturnRequest.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Order, as: 'order' },
                { model: PickupStation, as: 'pickupStation' }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        const enriched = await enrichReturnRequests(returns);
        res.json(enriched);
    } catch (e) {
        console.error('Error in listMyReturns:', e);
        res.status(500).json({ error: 'Failed to load returns' });
    }
};

/**
 * GET /api/returns/admin/all
 * List all returns for admin view.
 */
const adminListReturns = async (req, res) => {
    try {
        const { status, q } = req.query;
        const where = {};
        if (status) where.status = status;

        const include = [
            { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
            { 
                model: Order, 
                as: 'order',
                include: [
                    { 
                        model: DeliveryTask, 
                        as: 'deliveryTasks',
                        include: [{ model: User, as: 'deliveryAgent', attributes: ['id', 'name'] }]
                    },
                    { model: User, as: 'seller', attributes: ['id', 'name', 'businessName', 'businessAddress', 'phone'] }
                ]
            },
            { model: PickupStation, as: 'pickupStation' }
        ];

        // Add search support
        if (q) {
            where[Op.or] = [
                { '$order.orderNumber$': { [Op.like]: `%${q}%` } },
                { '$order.checkoutNumber$': { [Op.like]: `%${q}%` } },
                { '$user.name$': { [Op.like]: `%${q}%` } },
                { '$user.email$': { [Op.like]: `%${q}%` } }
            ];
        }

        const returns = await ReturnRequest.findAll({
            where,
            include,
            order: [['createdAt', 'DESC']]
        });

        res.json(returns);
    } catch (e) {
        console.error('Error in adminListReturns:', e);
        res.status(500).json({ error: 'Failed to load returns' });
    }
};

/**
 * POST /api/returns/:returnId/approve
 * Admin approves return and sets up logistics.
 */
const adminApproveReturn = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { adminNotes } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{ model: Order, as: 'order' }]
        });

        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });
        if (returnReq.status !== 'pending') return res.status(400).json({ error: 'Return already processed' });

        const t = await sequelize.transaction();
        try {
            await returnReq.update({
                status: 'approved',
                adminNotes,
                resolvedAt: new Date()
            }, { transaction: t });

            const order = returnReq.order;
            // Set destination warehouse for tracking (usually the original warehouse)
            const destinationWarehouseId = order.destinationWarehouseId || order.warehouseId || 1; // Fallback to 1 if not set
            
            await order.update({ 
                returnStatus: 'approved',
                status: 'return_approved',
                destinationWarehouseId: destinationWarehouseId
            }, { transaction: t });

            // Create Return Logistics Task
            // Logistics: customer_to_warehouse or customer_to_pickup_station
            const deliveryType = returnReq.pickupMethod === 'drop_off' ? 'pickup_station_to_warehouse' : 'customer_to_warehouse';
            
            await DeliveryTask.create({
                orderId: returnReq.orderId,
                deliveryType: deliveryType,
                status: 'assigned', // Admin will assign agent later or system auto-assigns
                pickupLocation: returnReq.pickupMethod === 'agent_pickup' ? returnReq.pickupAddress : null,
                pickupStationId: returnReq.pickupMethod === 'drop_off' ? returnReq.pickupStationId : null,
                notes: `RETURN LOGISTICS: ${returnReq.reasonCategory}`
            }, { transaction: t });

            await t.commit();
            
            // TODO: Notify customer
            
            res.json({ message: 'Return approved', returnRequest: returnReq });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in adminApproveReturn:', e);
        res.status(500).json({ error: 'Failed to approve return' });
    }
};

/**
 * POST /api/returns/:returnId/assign-agent
 */
const assignReturnAgent = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { deliveryAgentId } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId);
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        // Find the active delivery task for this order that is related to returns
        const task = await DeliveryTask.findOne({
            where: { 
                orderId: returnReq.orderId,
                deliveryType: { [Op.like]: '%to_warehouse%' },
                status: { [Op.in]: ['assigned', 'pending'] }
            }
        });

        if (!task) return res.status(404).json({ error: 'No active return delivery task found for this order' });

        await task.update({
            deliveryAgentId,
            status: 'assigned',
            assignedAt: new Date()
        });

        res.json({ success: true, message: 'Agent assigned to return task', task });
    } catch (e) {
        console.error('Error in assignReturnAgent:', e);
        res.status(500).json({ error: 'Failed to assign agent' });
    }
};

/**
 * POST /api/returns/:returnId/unassign-agent
 * Cancels active return delivery tasks and clears agent assignment.
 */
const unassignReturnAgent = async (req, res) => {
    try {
        const { returnId } = req.params;
        const returnReq = await ReturnRequest.findByPk(returnId);
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        const t = await sequelize.transaction();
        try {
            // Cancel all active return-related delivery tasks
            const activeTasks = await DeliveryTask.findAll({
                where: {
                    orderId: returnReq.orderId,
                    deliveryType: { [Op.like]: '%to_warehouse%' },
                    status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] }
                },
                transaction: t
            });

            const { revertPending } = require('../utils/walletHelpers');

            for (const task of activeTasks) {
                if (task.deliveryAgentId) {
                    const agentShare = parseFloat(task.agentShare) || 70;
                    const potentialEarnings = (parseFloat(task.deliveryFee) || 0) * (agentShare / 100);
                    if (potentialEarnings > 0) {
                        await revertPending(task.deliveryAgentId, potentialEarnings, returnReq.orderId, t);
                    }
                }
                await task.update({
                    status: 'cancelled',
                    rejectionReason: 'Unassigned by Admin'
                }, { transaction: t });
            }

            // Note: Unlike normal orders, ReturnRequest doesn't have a deliveryAgentId column itself 
            // (it relies on order and tasks), but we could update audit logs or adminNotes.
            await returnReq.update({
                adminNotes: `${returnReq.adminNotes || ''}\n[${new Date().toISOString()}] Agent unassigned by admin: ${req.user.name || req.user.id}`
            }, { transaction: t });

            await t.commit();
            res.json({ success: true, message: 'Agent unassigned from return tasks' });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in unassignReturnAgent:', e);
        res.status(500).json({ error: 'Failed to unassign agent' });
    }
};

/**
 * POST /api/returns/:returnId/assign-agent-leg
 * Assigns a delivery agent to a specific logistics leg of a return.
 * Body: { leg, deliveryAgentId, pickupLocation?, deliveryLocation?, deliveryFee?, notes? }
 */
const assignReturnAgentLeg = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { leg, deliveryAgentId, pickupLocation, deliveryLocation, deliveryFee, notes } = req.body;

        const VALID_LEGS = ['customer_to_warehouse', 'pickup_station_to_warehouse', 'warehouse_to_seller'];
        if (!VALID_LEGS.includes(leg)) {
            return res.status(400).json({ error: `Invalid leg. Must be one of: ${VALID_LEGS.join(', ')}` });
        }

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{ model: Order, as: 'order' }]
        });
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        // Find existing task for this leg
        let task = await DeliveryTask.findOne({
            where: {
                orderId: returnReq.orderId,
                deliveryType: leg,
                status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
        });

        if (task) {
            await task.update({
                deliveryAgentId,
                status: 'assigned',
                assignedAt: new Date(),
                ...(pickupLocation && { pickupLocation }),
                ...(deliveryLocation && { deliveryLocation }),
                ...(deliveryFee !== undefined && { deliveryFee }),
                ...(notes && { notes })
            });
        } else {
            task = await DeliveryTask.create({
                orderId: returnReq.orderId,
                deliveryType: leg,
                deliveryAgentId,
                status: 'assigned',
                assignedAt: new Date(),
                pickupLocation: pickupLocation || null,
                deliveryLocation: deliveryLocation || null,
                deliveryFee: deliveryFee || 0,
                notes: notes || `RETURN LEG: ${leg} for Return #${returnId}`
            });
        }

        // If warehouse-to-seller leg, update order status
        if (leg === 'warehouse_to_seller') {
            await Order.update(
                { status: 'return_in_transit', returnStatus: 'returning_to_seller' },
                { where: { id: returnReq.orderId } }
            );
        }

        res.json({ success: true, message: `Agent assigned to ${leg} leg`, task });
    } catch (e) {
        console.error('Error in assignReturnAgentLeg:', e);
        res.status(500).json({ error: 'Failed to assign agent to leg' });
    }
};

/**
 * POST /api/returns/:returnId/create-warehouse-to-seller-task
 * Creates the final logistics leg task: warehouse → seller.
 */
const createWarehouseToSellerTask = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { deliveryLocation, deliveryFee, notes } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{
                model: Order,
                as: 'order',
                include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'businessAddress', 'phone'] }]
            }]
        });
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        // Check if task already exists
        const existingTask = await DeliveryTask.findOne({
            where: {
                orderId: returnReq.orderId,
                deliveryType: 'warehouse_to_seller',
                status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
        });

        if (existingTask) {
            return res.json({ success: true, message: 'Warehouse-to-seller task already exists', task: existingTask, alreadyExists: true });
        }

        const sellerAddress = deliveryLocation
            || returnReq.order?.seller?.businessAddress
            || 'Seller address not on file';

        const task = await DeliveryTask.create({
            orderId: returnReq.orderId,
            deliveryType: 'warehouse_to_seller',
            status: 'pending',
            pickupLocation: null,
            deliveryLocation: sellerAddress,
            deliveryFee: deliveryFee || 0,
            notes: notes || `RETURN: Deliver back to seller for Return #${returnId}`
        });

        await returnReq.update({
            adminNotes: `${returnReq.adminNotes || ''}\n[${new Date().toISOString()}] Warehouse-to-seller task created.`
        });

        res.json({ success: true, message: 'Warehouse-to-seller task created. Assign an agent to complete it.', task });
    } catch (e) {
        console.error('Error in createWarehouseToSellerTask:', e);
        res.status(500).json({ error: 'Failed to create warehouse-to-seller task' });
    }
};

/**
 * GET /api/returns/:returnId/logistics
 * Returns all return-related delivery tasks with agent details.
 */
const getReturnLogistics = async (req, res) => {
    try {
        const { returnId } = req.params;
        const returnReq = await ReturnRequest.findByPk(returnId);
        if (!returnReq) return res.status(404).json({ error: 'Return not found' });

        const returnLegs = ['customer_to_warehouse', 'pickup_station_to_warehouse', 'warehouse_to_seller'];
        const tasks = await DeliveryTask.findAll({
            where: {
                orderId: returnReq.orderId,
                deliveryType: { [Op.in]: returnLegs }
            },
            include: [{ model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }],
            order: [['createdAt', 'ASC']]
        });

        res.json({ success: true, tasks });
    } catch (e) {
        console.error('Error in getReturnLogistics:', e);
        res.status(500).json({ error: 'Failed to fetch return logistics' });
    }
};

/**
 * POST /api/returns/:returnId/reject
 */
const adminRejectReturn = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { adminNotes } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId);
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        await returnReq.update({
            status: 'rejected',
            adminNotes,
            resolvedAt: new Date()
        });

        await Order.update({ 
            returnStatus: 'rejected',
            status: 'delivered' // Revert to delivered if return is rejected
        }, { 
            where: { id: returnReq.orderId } 
        });

        res.json({ message: 'Return rejected', returnRequest: returnReq });
    } catch (e) {
        console.error('Error in adminRejectReturn:', e);
        res.status(500).json({ error: 'Failed to reject return' });
    }
};

/**
 * POST /api/returns/:returnId/confirm-receipt
 * Warehouse/Admin confirms item has been received and inspected.
 */
const confirmReturnReceipt = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { inspectionNotes, itemsStatus } = req.body; // itemsStatus: [{orderItemId, status: 'good'|'damaged'}]

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{ model: Order, as: 'order' }]
        });

        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        const t = await sequelize.transaction();
        try {
            await returnReq.update({
                status: 'item_received',
                adminNotes: inspectionNotes ? `${returnReq.adminNotes || ''}\nInspection: ${inspectionNotes}` : returnReq.adminNotes
            }, { transaction: t });

            // Update item statuses if provided
            if (itemsStatus && Array.isArray(itemsStatus)) {
                for (const stat of itemsStatus) {
                    await OrderItem.update({ returnStatus: 'completed' }, { 
                        where: { id: stat.orderItemId, orderId: returnReq.orderId },
                        transaction: t 
                    });
                }
            }

            await t.commit();
            res.json({ message: 'Return receipt confirmed', returnRequest: returnReq });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in confirmReturnReceipt:', e);
        res.status(500).json({ error: 'Failed to confirm receipt' });
    }
};

/**
 * POST /api/returns/:returnId/refund
 * Admin processes the refund for the return.
 */
const processReturnRefund = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { refundAmount, adminNotes } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{ model: Order, as: 'order' }]
        });
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });
        if (returnReq.status === 'completed') return res.status(400).json({ error: 'Return already completed' });

        const userId = returnReq.userId;
        const amount = parseFloat(refundAmount);
        
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Valid refund amount is required' });
        }

        const t = await sequelize.transaction();
        try {
            // 1. Update Return Request
            await returnReq.update({
                status: 'completed',
                adminNotes: adminNotes ? `${returnReq.adminNotes || ''}\nRefund: ${adminNotes}` : returnReq.adminNotes,
                resolvedAt: new Date()
            }, { transaction: t });

            // 2. Update Wallet
            let wallet = await Wallet.findOne({ where: { userId }, transaction: t });
            if (!wallet) {
                wallet = await Wallet.create({ userId, balance: 0 }, { transaction: t });
            }
            await wallet.update({ balance: wallet.balance + amount }, { transaction: t });

            // 3. Create Transaction
            await Transaction.create({
                userId,
                amount,
                type: 'credit',
                status: 'completed',
                description: `Refund for Return #${returnId} (Order #${returnReq.order?.orderNumber})`,
                orderId: returnReq.orderId,
                note: adminNotes,
                walletType: 'customer'
            }, { transaction: t });

            // 4. Update Order
            // Check if all items in order are returned
            const allItems = await OrderItem.findAll({ where: { orderId: returnReq.orderId }, transaction: t });
            const allReturned = allItems.every(i => i.returnStatus === 'completed' || i.returnStatus === 'returned');

            await Order.update({ 
                returnStatus: allReturned ? 'returned' : 'partially_returned',
                status: allReturned ? 'returned' : 'delivered'
            }, { 
                where: { id: returnReq.orderId },
                transaction: t 
            });

            await t.commit();
            res.json({ success: true, message: 'Refund processed and return completed', balance: wallet.balance });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in processReturnRefund:', e);
        res.status(500).json({ error: 'Failed to process refund' });
    }
};

/**
 * POST /api/returns/:returnId/complete (LEGACY - replaced by processReturnRefund but keeping for safety)
 */
const completeReturn = async (req, res) => {
    // Forward to refund if amount is provided, otherwise just complete
    if (req.body.refundAmount) {
        return processReturnRefund(req, res);
    }
    
    try {
        const { returnId } = req.params;
        const { adminNotes } = req.body;

        const returnReq = await ReturnRequest.findByPk(returnId, {
            include: [{ model: Order, as: 'order' }]
        });
        if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

        const t = await sequelize.transaction();
        try {
            await returnReq.update({
                status: 'completed',
                adminNotes: adminNotes ? `${returnReq.adminNotes || ''}\nCompletion: ${adminNotes}` : returnReq.adminNotes,
                resolvedAt: new Date()
            }, { transaction: t });

            const allItems = await OrderItem.findAll({ where: { orderId: returnReq.orderId }, transaction: t });
            const allReturned = allItems.every(i => i.returnStatus === 'completed');

            await Order.update({ 
                returnStatus: allReturned ? 'returned' : 'partially_returned',
                status: allReturned ? 'returned' : 'delivered'
            }, { 
                where: { id: returnReq.orderId },
                transaction: t 
            });

            await t.commit();
            res.json({ message: 'Return completed successfully', returnRequest: returnReq });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (e) {
        console.error('Error in completeReturn:', e);
        res.status(500).json({ error: 'Failed to complete return' });
    }
};

module.exports = {
    requestReturn,
    listMyReturns,
    adminListReturns,
    adminApproveReturn,
    assignReturnAgent,
    assignReturnAgentLeg,
    createWarehouseToSellerTask,
    getReturnLogistics,
    adminRejectReturn,
    unassignReturnAgent,
    confirmReturnReceipt,
    processReturnRefund,
    completeReturn
};
