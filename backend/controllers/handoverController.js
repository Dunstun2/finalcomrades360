const { HandoverCode, Order, DeliveryTask, User, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../realtime/socket');
const { confirmHandoverProcessor } = require('../services/handoverService');
const { creditAgentForTask } = require('../services/earningsService');

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
    agent_to_warehouse: { taskStatus: 'completed',   orderStatus: 'at_warehouse' },
    warehouse_to_agent: { taskStatus: 'in_progress', orderStatus: 'in_transit' },
    agent_to_station:   { taskStatus: 'completed',   orderStatus: 'at_pick_station' },
    agent_to_customer:  { taskStatus: 'completed',   orderStatus: 'delivered' },
    station_to_customer: { taskStatus: 'completed',   orderStatus: 'delivered' },
    seller_to_warehouse: { taskStatus: 'completed',   orderStatus: 'at_warehouse' },
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

        // Check if already confirmed for this specific order/type
        const alreadyConfirmed = await HandoverCode.findOne({
            where: { orderId, handoverType, status: 'confirmed' }
        });
        if (alreadyConfirmed) {
            return res.status(400).json({ error: 'This handover has already been confirmed and completed.' });
        }

        // Expire any previous pending codes for this order+type (standard flow)
        await HandoverCode.update(
            { status: 'expired' },
            { where: { orderId, handoverType, status: 'pending' } }
        );

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Auto-confirmation logic for customer-facing handovers (3 minute fallback)
        let autoConfirmAt = null;
        if (['agent_to_customer', 'station_to_customer'].includes(handoverType)) {
            autoConfirmAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
            console.log(`[Handover] Setting autoConfirmAt for ${handoverType} to ${autoConfirmAt}`);
        }

        const handoverCode = await HandoverCode.create({
            code,
            orderId,
            taskId: taskId || null,
            handoverType,
            initiatorId,
            status: 'pending',
            expiresAt,
            autoConfirmAt
        });

        console.log(`[Handover] Code ${code} generated for order #${order.orderNumber} — type: ${handoverType} — by user ${initiatorId}`);

        // Notify potential confirmers in real-time
        try {
            const io = getIO();
            if (io) {
                const payload = {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    handoverType,
                    label: HANDOVER_LABELS[handoverType],
                    expiresAt,
                    status: 'pending'
                };
                // If it's seller_to_agent, the agent is the receiver
                if (handoverType === 'seller_to_agent' && order.deliveryAgentId) {
                    io.to(`user:${order.deliveryAgentId}`).emit('handover:generated', payload);
                }
                // If it's agent_to_warehouse, the warehouse is the receiver (notified via admin/logistics channel)
                if (['agent_to_warehouse', 'seller_to_warehouse'].includes(handoverType)) {
                    io.to('admin').emit('handover:generated', payload);
                }
                // If it's station_to_customer or agent_to_customer, the customer is the receiver
                if (['station_to_customer', 'agent_to_customer'].includes(handoverType) && order.userId) {
                    io.to(`user:${order.userId}`).emit('handover:generated', payload);
                }
            }
        } catch (socketErr) {
            console.warn('[Handover] Socket notification failed for generation:', socketErr.message);
        }

        return res.json({
            success: true,
            handoverId: handoverCode.id,
            code,
            handoverType,
            label: HANDOVER_LABELS[handoverType],
            expiresAt,
            autoConfirmAt: handoverCode.autoConfirmAt,
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

        // Fallback for handoverType mismatch on same order
        if (!handoverCode) {
            const potentialCodes = await HandoverCode.findAll({
                where: { code, orderId, status: 'pending' },
                include: [{ model: Order, as: 'order' }, { model: DeliveryTask, as: 'task' }],
                transaction: t,
                lock: true
            });

            if (potentialCodes.length === 1) {
                const pc = potentialCodes[0];
                const isTypeMismatch = 
                    (handoverType === 'agent_to_warehouse' && pc.handoverType === 'agent_to_station') ||
                    (handoverType === 'agent_to_station' && pc.handoverType === 'agent_to_warehouse') ||
                    (handoverType === 'agent_to_warehouse' && pc.handoverType === 'seller_to_warehouse') ||
                    (handoverType === 'seller_to_warehouse' && pc.handoverType === 'agent_to_warehouse') ||
                    (handoverType === 'seller_to_agent' && pc.handoverType === 'seller_to_warehouse') ||
                    (['agent_to_warehouse', 'agent_to_station', 'seller_to_warehouse'].includes(handoverType) && pc.handoverType === 'seller_to_agent');
                
                if (isTypeMismatch) {
                    handoverCode = pc;
                }
            }
        }

        // Final Fallback for customer-facing codes (resolved by code + type scoped to the confirmer's own order)
        if (!handoverCode) {
            // Note: confirmerId might be a string for station managers, but Order.userId is always an INTEGER.
            // This fallback is primarily for customers (who have INTEGER IDs).
            const numericConfirmerId = parseInt(confirmerId, 10);
            if (!isNaN(numericConfirmerId)) {
                handoverCode = await HandoverCode.findOne({
                    where: { code, handoverType, status: 'pending' },
                    include: [
                        {
                            model: Order,
                            as: 'order',
                            where: { userId: numericConfirmerId },
                            required: true
                        },
                        { model: DeliveryTask, as: 'task' }
                    ],
                    transaction: t,
                    lock: true
                });
            }
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

        // Refactored logic: Use handoverService for atomicity and reusability
        const handoverId = handoverCode.id;
        await t.commit(); // Close current transaction as processor handles its own or takes one

        try {
            const result = await confirmHandoverProcessor(handoverId, confirmerId, notes);

            if (result.success) {
                // Real-time notification logic (Retained from controller)
                try {
                    const io = getIO();
                    const order = await Order.findByPk(orderId);
                    if (io && order) {
                        const payload = {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            handoverType,
                            label: HANDOVER_LABELS[handoverType],
                            newOrderStatus: order.status,
                            confirmedAt: new Date()
                        };
                        io.to(`user:${handoverCode.initiatorId}`).emit('handover:confirmed', payload);
                        io.to(`user:${confirmerId}`).emit('handover:confirmed', payload);
                        io.to('admin').emit('handover:confirmed', { ...payload, confirmerId });
                        
                        // Push status update to all relevant parties
                        const statusUpdate = {
                            orderId: order.id,
                            status: order.status,
                            orderNumber: order.orderNumber,
                            warehouseArrivalDate: order.warehouseArrivalDate,
                            deliveryAgentId: order.deliveryAgentId
                        };
                        io.to(`user:${order.userId}`).emit('orderStatusUpdate', statusUpdate);
                        io.to('admin').emit('orderStatusUpdate', statusUpdate);
                    }
                } catch (socketErr) {
                    console.warn('[Handover] Socket notification failed in confirmHandoverCode:', socketErr.message);
                }

                return res.json({ 
                    success: true, 
                    message: result.message,
                    handoverType 
                });
            } else {
                return res.status(400).json({ success: false, message: result.message });
            }
        } catch (procErr) {
            console.error('[Handover] Processor failed:', procErr);
            throw procErr;
        }
    } catch (e) {
        // Only rollback if the transaction hasn't been committed yet
        if (t && !t.finished) {
            try {
                await t.rollback();
            } catch (rollbackErr) { }
        }
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
