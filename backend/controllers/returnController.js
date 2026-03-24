const { ReturnRequest, Order, OrderItem, User, DeliveryTask, PickupStation, Refund, sequelize, Op } = require('../models');

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
 * GET /api/returns/my-returns
 * List returns for the current customer.
 */
const listMyReturns = async (req, res) => {
    try {
        const returns = await ReturnRequest.findAll({
            where: { userId: req.user.id },
            include: [{ model: Order, as: 'order' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(returns);
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
        const { status } = req.query;
        const where = {};
        if (status) where.status = status;

        const returns = await ReturnRequest.findAll({
            where,
            include: [
                { 
                    model: Order, 
                    as: 'order',
                    include: [
                        { model: DeliveryTask, as: 'deliveryTasks' }
                    ]
                },
                { model: User, as: 'user', attributes: ['id', 'name', 'phone', 'email', 'businessName'] }
            ],
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
            await order.update({ returnStatus: 'approved' }, { transaction: t });

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
                note: adminNotes
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
    adminRejectReturn,
    confirmReturnReceipt,
    processReturnRefund,
    completeReturn
};
