const { HandoverCode, Order, DeliveryTask, User, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../realtime/socket');

// ─── Handover type → readable label ───────────────────────────────────────────
const HANDOVER_LABELS = {
    seller_to_agent:       'Seller → Agent Pickup',
    agent_to_warehouse:    'Agent → Warehouse Drop-off',
    warehouse_to_agent:    'Warehouse → Agent Pickup',
    agent_to_station:      'Agent → Pickup Station Drop-off',
    agent_to_customer:     'Agent → Customer Delivery',
    station_to_customer:   'Pickup Station → Customer Pickup',
    seller_to_warehouse:   'Seller (Internal) → Warehouse Drop-off',
};

// ─── Which order status transitions fire on confirmation ───────────────────────
const HANDOVER_TRANSITIONS = {
    seller_to_agent:    { taskStatus: 'in_progress', orderStatus: 'in_transit' },
    agent_to_warehouse: { taskStatus: 'in_progress', orderStatus: 'at_warehouse' },
    warehouse_to_agent: { taskStatus: 'in_progress', orderStatus: 'in_transit' },
    agent_to_station:   { taskStatus: 'in_progress', orderStatus: 'ready_for_pickup' },
    agent_to_customer:  { taskStatus: 'completed',   orderStatus: 'delivered' },
    station_to_customer: { taskStatus: 'completed',   orderStatus: 'delivered' },
    seller_to_warehouse: { taskStatus: 'in_progress', orderStatus: 'at_warehouse' },
};

// ─── Generate a 5-digit code ───────────────────────────────────────────────────
function generateCode() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

// ─── POST /api/handover/generate ──────────────────────────────────────────────
const generateHandoverCode = async (req, res) => {
    try {
        const { orderId, taskId, handoverType } = req.body;
        const initiatorId = req.user.id;

        if (!orderId || !handoverType || !HANDOVER_LABELS[handoverType]) {
            return res.status(400).json({ error: 'orderId and a valid handoverType are required.' });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        // Check if already confirmed
        const alreadyConfirmed = await HandoverCode.findOne({
            where: { orderId, handoverType, status: 'confirmed' }
        });
        if (alreadyConfirmed) {
            return res.status(400).json({ error: 'This handover has already been confirmed and completed.' });
        }

        // Expire any previous pending codes for this order+type
        await HandoverCode.update(
            { status: 'expired' },
            { where: { orderId, handoverType, status: 'pending' } }
        );

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        const handoverCode = await HandoverCode.create({
            code,
            orderId,
            taskId: taskId || null,
            handoverType,
            initiatorId,
            status: 'pending',
            expiresAt
        });

        console.log(`[Handover] Code ${code} generated for order #${order.orderNumber} — type: ${handoverType} — by user ${initiatorId}`);

        return res.json({
            success: true,
            handoverId: handoverCode.id,
            code,
            handoverType,
            label: HANDOVER_LABELS[handoverType],
            expiresAt,
            orderNumber: order.orderNumber
        });
    } catch (e) {
        console.error('[Handover] Error generating code:', e);
        return res.status(500).json({ error: 'Failed to generate handover code.' });
    }
};

// ─── POST /api/handover/confirm ───────────────────────────────────────────────
const confirmHandoverCode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { code, orderId, handoverType, notes } = req.body;
        const confirmerId = req.user.id;

        if (!code || !orderId || !handoverType) {
            await t.rollback();
            return res.status(400).json({ error: 'code, orderId, and handoverType are required.' });
        }

        // Find the pending code (primary: exact orderId match)
        let handoverCode = await HandoverCode.findOne({
            where: { code, orderId, handoverType, status: 'pending' },
            include: [{ model: Order, as: 'order' }, { model: DeliveryTask, as: 'task' }],
            transaction: t,
            lock: true
        });

        // Fallback for grouped-order UX: if orderId mismatches but code is valid for this customer,
        // resolve by code + type scoped to the confirmer's own order.
        if (!handoverCode) {
            handoverCode = await HandoverCode.findOne({
                where: { code, handoverType, status: 'pending' },
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: { userId: confirmerId },
                        required: true
                    },
                    { model: DeliveryTask, as: 'task' }
                ],
                transaction: t,
                lock: true
            });
        }

        if (!handoverCode) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid or expired code. Please ask the giver to regenerate.' });
        }

        // Check expiry
        if (new Date() > new Date(handoverCode.expiresAt)) {
            await handoverCode.update({ status: 'expired' }, { transaction: t });
            await t.rollback();
            return res.status(400).json({ error: 'This code has expired. Please ask the giver to generate a new one.' });
        }

        // Prevent self-confirmation (initiator cannot confirm their own code)
        if (handoverCode.initiatorId === confirmerId) {
            await t.rollback();
            return res.status(403).json({ error: 'You cannot confirm your own handover code.' });
        }

        // Mark code as confirmed
        await handoverCode.update({
            status: 'confirmed',
            confirmerId,
            confirmedAt: new Date(),
            notes: notes || null
        }, { transaction: t });

        const order = handoverCode.order;
        const transition = HANDOVER_TRANSITIONS[handoverType];

        if (handoverType === 'agent_to_customer' && order && !order.paymentConfirmed) {
            await t.rollback();
            return res.status(400).json({ error: 'Cannot confirm customer delivery before payment is confirmed.' });
        }

        // Apply order and task status transitions
        if (order && transition) {
            const orderUpdates = { status: transition.orderStatus };

            // For delivery, set the actual timestamps
            if (handoverType === 'agent_to_customer') {
                orderUpdates.actualDelivery = new Date();
            }
            if (handoverType === 'seller_to_agent') {
                orderUpdates.pickedUpAt = new Date();
                orderUpdates.sellerHandoverConfirmed = true;
                orderUpdates.sellerHandoverConfirmedAt = new Date();
            }

            await order.update(orderUpdates, { transaction: t });

            // Update delivery task if linked
            if (handoverCode.task) {
                const taskUpdates = { status: transition.taskStatus };
                if (handoverType === 'seller_to_agent') {
                    taskUpdates.collectedAt = new Date();
                    taskUpdates.startedAt = handoverCode.task.startedAt || new Date();
                }
                if (handoverType === 'agent_to_customer') {
                    taskUpdates.completedAt = new Date();
                }
                await handoverCode.task.update(taskUpdates, { transaction: t });
            }
        }

        await t.commit();

        console.log(`[Handover] Code ${code} confirmed for order #${order?.orderNumber} — type: ${handoverType} — by user ${confirmerId}`);

        // Real-time notification to both parties
        try {
            const io = getIO();
            if (io && order) {
                const payload = {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    handoverType,
                    label: HANDOVER_LABELS[handoverType],
                    newOrderStatus: transition?.orderStatus,
                    confirmedAt: new Date()
                };
                // Notify initiator (giver)
                io.to(`user:${handoverCode.initiatorId}`).emit('handover:confirmed', payload);
                // Notify confirmer (receiver)
                io.to(`user:${confirmerId}`).emit('handover:confirmed', payload);
                // Notify admin
                io.to('admin').emit('handover:confirmed', { ...payload, confirmerId });
                // Notify customer
                if (order.userId && order.userId !== confirmerId) {
                    io.to(`user:${order.userId}`).emit('orderStatusUpdate', {
                        orderId: order.id,
                        status: transition?.orderStatus,
                        orderNumber: order.orderNumber
                    });
                }
            }
        } catch (socketErr) {
            console.warn('[Handover] Socket notification failed:', socketErr.message);
        }

        // Persist notification for initiator
        try {
            await Notification.create({
                userId: handoverCode.initiatorId,
                title: '✅ Handover Confirmed',
                message: `${HANDOVER_LABELS[handoverType]} for Order #${order?.orderNumber} has been confirmed.`,
                type: 'success'
            });
        } catch (notifErr) {
            console.warn('[Handover] Notification creation failed:', notifErr.message);
        }

        return res.json({
            success: true,
            message: `✅ Handover confirmed: ${HANDOVER_LABELS[handoverType]}`,
            handoverType,
            newOrderStatus: transition?.orderStatus,
            orderNumber: order?.orderNumber
        });

    } catch (e) {
        await t.rollback();
        console.error('[Handover] Error confirming code:', e);
        return res.status(500).json({ error: 'Failed to confirm handover code.' });
    }
};

// ─── GET /api/handover/status/:orderId/:handoverType ─────────────────────────
// Lets the UI poll for an active pending code (so the initiator can see their code)
const getHandoverStatus = async (req, res) => {
    try {
        const { orderId, handoverType } = req.params;
        const userId = req.user.id;

        const handoverCode = await HandoverCode.findOne({
            where: {
                orderId,
                handoverType,
                status: 'pending',
                initiatorId: userId,
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!handoverCode) {
            // Check if it was already confirmed
            const confirmed = await HandoverCode.findOne({
                where: { orderId, handoverType, status: 'confirmed' }
            });
            return res.json({ active: false, confirmed: !!confirmed });
        }

        return res.json({
            active: true,
            confirmed: false,
            handoverId: handoverCode.id,
            code: handoverCode.code,
            expiresAt: handoverCode.expiresAt,
            label: HANDOVER_LABELS[handoverType]
        });
    } catch (e) {
        console.error('[Handover] Error getting status:', e);
        return res.status(500).json({ error: 'Failed to get handover status.' });
    }
};

module.exports = {
    generateHandoverCode,
    confirmHandoverCode,
    getHandoverStatus
};
