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
    pickup_station_to_warehouse: 'Pickup Station → Warehouse Hub',
    station_to_agent:      'Pickup Station → Delivery Agent',
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
    pickup_station_to_warehouse: { taskStatus: 'completed', orderStatus: 'at_warehouse' },
    station_to_agent:      { taskStatus: 'in_progress', orderStatus: 'in_transit' },
};

// ─── Generate a 5-digit code ───────────────────────────────────────────────────
function generateCode() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

// ─── POST /api/handover/generate ──────────────────────────────────────────────
const generateHandoverCode = async (req, res) => {
    try {
        const { orderId, taskId, handoverType } = req.body;
        const initiatorId = req.user?.id;

        console.log(`[Handover] DEBUG Generation Request: orderId=${orderId}, type=${handoverType}, initiatorId=${initiatorId}`);
        console.log(`[Handover] Full Body: ${JSON.stringify(req.body)}`);

        if (!initiatorId) {
            return res.status(401).json({ error: 'Unauthorized: No initiator ID found.' });
        }

        if (!orderId) {
            return res.status(400).json({ error: 'Missing orderId' });
        }
        if (!handoverType) {
            return res.status(400).json({ error: 'Missing handoverType' });
        }
        if (!HANDOVER_LABELS[handoverType]) {
            return res.status(400).json({ error: `Invalid handoverType: ${handoverType}` });
        }

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        // Check if already confirmed for this specific order/type
        const alreadyConfirmed = await HandoverCode.findOne({
            where: { orderId, handoverType, status: 'confirmed' }
        });
        if (alreadyConfirmed) {
            console.log(`[Handover] Re-generating code for already confirmed handover type ${handoverType} for order #${order.orderNumber}`);
            // We allow this to fix situations where the agent/stff missed the confirmation or need a retry.
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
                // If it's a release from warehouse/station to agent, the agent is the receiver
                if (['warehouse_to_agent', 'station_to_agent'].includes(handoverType) && order.deliveryAgentId) {
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

// ─── POST /api/handover/bulk-generate ─────────────────────────────────────────
const generateBulkHandoverCode = async (req, res) => {
    try {
        const { orderIds, handoverType } = req.body;
        const initiatorId = req.user?.id;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid orderIds array' });
        }
        if (!handoverType) {
            return res.status(400).json({ error: 'Missing handoverType' });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Create HandoverCode records for all orders
        const records = await Promise.all(orderIds.map(oId => 
            HandoverCode.create({
                code,
                orderId: oId,
                handoverType,
                initiatorId,
                status: 'pending',
                expiresAt
            })
        ));

        console.log(`[Handover] Bulk Code ${code} generated for ${orderIds.length} orders — type: ${handoverType}`);

        return res.json({
            success: true,
            code,
            handoverType,
            label: HANDOVER_LABELS[handoverType],
            expiresAt,
            count: records.length
        });
    } catch (e) {
        console.error('[Handover] Error generating bulk code:', e);
        return res.status(500).json({ error: 'Failed to generate bulk handover code.' });
    }
};

// ─── POST /api/handover/confirm ───────────────────────────────────────────────
const confirmHandoverCode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { code, orderId, taskId, handoverType, notes } = req.body;
        const confirmerId = req.user.id; // The person ENTERING the code (Receiver)

        console.log(`[Handover] Confirming code for order ${orderId}, type ${handoverType}, task ${taskId || 'n/a'}`);

        if (!code || !orderId || !handoverType) {
            await t.rollback();
            return res.status(400).json({ error: 'code, orderId, and handoverType are required.' });
        }

        // Find the pending code (primary: exact orderId + type match)
        let handoverCode = await HandoverCode.findOne({
            where: { code, orderId, handoverType },
            include: [{ model: Order, as: 'order' }, { model: DeliveryTask, as: 'task' }],
            transaction: t,
            lock: true
        });

        if (handoverCode && handoverCode.status === 'confirmed') {
            await t.rollback();
            return res.json({ 
                success: true, 
                message: 'This handover has already been confirmed.',
                handoverType 
            });
        }

        // Filter to only pending if we found one but it was maybe expired/other
        if (handoverCode && handoverCode.status !== 'pending') {
            handoverCode = null; // Forces fallback checks or failure
        }

        // Fallback for handoverType mismatch on same order:
        // If no exact match (type mismatch), but there is EXACTLY ONE pending code for this orderId 
        // with the provided digits, we accept it. This handles cases where givers accidentally 
        // selected the wrong leg type (e.g. seller_to_warehouse vs warehouse_to_agent) but it's 
        // clearly for the same order and they gave the code to the receiver.
        if (!handoverCode) {
            console.log(`[Handover] NOTICE: Primary lookup failed for order ${orderId}, code ${code}, type ${handoverType}. Checking order-wide matches...`);
            
            const orderWideMatches = await HandoverCode.findAll({
                where: { code, orderId, status: 'pending' },
                include: [{ model: Order, as: 'order' }, { model: DeliveryTask, as: 'task' }],
                transaction: t,
                lock: true
            });

            if (orderWideMatches.length === 1) {
                handoverCode = orderWideMatches[0];
                console.log(`[Handover] SUCCESS: Resolved via order-wide unique match. Original type: ${handoverCode.handoverType}, Requested type: ${handoverType}`);
            } else if (orderWideMatches.length > 1) {
                console.warn(`[Handover] ERROR: Ambiguous code ${code} for order ${orderId}. Found ${orderWideMatches.length} pending codes.`);
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

                        // CRITICAL: Also notify the current delivery agent if they are the one confirmed
                        if (order.deliveryAgentId) {
                            io.to(`user:${order.deliveryAgentId}`).emit('orderStatusUpdate', statusUpdate);
                            console.log(`[Handover] Emitted orderStatusUpdate to agent ${order.deliveryAgentId} room: user:${order.deliveryAgentId}`);
                        }
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

// ─── POST /api/handover/bulk-confirm ──────────────────────────────────────────
const confirmBulkHandoverCode = async (req, res) => {
    try {
        const { code, handoverType, orderIds } = req.body;
        const confirmerId = req.user.id;

        if (!code || !handoverType) {
            return res.status(400).json({ error: 'code and handoverType are required.' });
        }

        // Find all pending codes matching this digit set and type
        // If orderIds provided, restrict to those. Otherwise, check all for this type.
        const where = {
            code,
            handoverType,
            status: 'pending',
            expiresAt: { [Op.gt]: new Date() }
        };
        if (orderIds && Array.isArray(orderIds)) {
            where.orderId = { [Op.in]: orderIds };
        }

        const pendingCodes = await HandoverCode.findAll({ where });

        if (pendingCodes.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired code for the selected orders.' });
        }

        const results = [];
        for (const hCode of pendingCodes) {
            try {
                // Use the existing processor service
                const res = await confirmHandoverProcessor(hCode.id, confirmerId);
                results.push({ orderId: hCode.orderId, success: res.success });
            } catch (err) {
                results.push({ orderId: hCode.orderId, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[Handover] Bulk confirmation complete: ${successCount}/${pendingCodes.length} successful.`);

        return res.json({
            success: true,
            message: `Successfully confirmed ${successCount} of ${pendingCodes.length} handovers.`,
            results
        });
    } catch (e) {
        console.error('[Handover] Error confirming bulk code:', e);
        return res.status(500).json({ error: 'Failed to confirm bulk handover code.' });
    }
};

// ─── GET /api/handover/status/:orderId/:handoverType ─────────────────────────
// Lets the UI poll for an active pending code (so the initiator can see their code)
const getHandoverStatus = async (req, res) => {
    try {
        const { orderId, handoverType } = req.params;
        const userId = req.user.id;

        console.log(`[Handover] DEBUG Status Check: Order=${orderId}, Type=${handoverType}, User=${userId}`);

        let handoverCode = await HandoverCode.findOne({
            where: {
                orderId,
                handoverType,
                status: 'pending',
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        // Fallback: If no exact type match, check for ANY pending code for this order
        if (!handoverCode) {
            handoverCode = await HandoverCode.findOne({
                where: {
                    orderId,
                    status: 'pending',
                    expiresAt: { [Op.gt]: new Date() }
                },
                order: [['createdAt', 'DESC']]
            });
            if (handoverCode) {
                console.log(`[Handover] NOTICE: found mismatched type active code (${handoverCode.handoverType}) for order ${orderId} status check. Expecting: ${handoverType}`);
            }
        }

        if (!handoverCode) {
            console.log(`[Handover] DEBUG: No active pending code found for order ${orderId} (Exact or fallback)`);
            // Check if it was already confirmed
            const confirmed = await HandoverCode.findOne({
                where: { orderId, handoverType, status: 'confirmed' }
            });
            if (!confirmed) {
                // Check if ANY code was confirmed for this order recently
                const anyConfirmed = await HandoverCode.findOne({
                    where: { orderId, status: 'confirmed' },
                    order: [['confirmedAt', 'DESC']]
                });
                if (anyConfirmed) {
                     console.log(`[Handover] DEBUG: Found confirmed code for different type (${anyConfirmed.handoverType}) for order ${orderId}`);
                }
            }
            return res.json({ active: false, confirmed: !!confirmed });
        }

        console.log(`[Handover] SUCCESS: Returning active status for order ${orderId} (Type: ${handoverCode.handoverType})`);
        return res.json({
            active: true,
            confirmed: false,
            handoverId: handoverCode.id,
            actualHandoverType: handoverCode.handoverType, 
            code: (handoverCode.initiatorId === userId) ? handoverCode.code : undefined,
            expiresAt: handoverCode.expiresAt,
            label: HANDOVER_LABELS[handoverCode.handoverType] || HANDOVER_LABELS[handoverType]
        });
    } catch (e) {
        console.error('[Handover] Error getting status:', e);
        return res.status(500).json({ error: 'Failed to get handover status.' });
    }
};

module.exports = {
    generateHandoverCode,
    generateBulkHandoverCode,
    confirmHandoverCode,
    confirmBulkHandoverCode,
    getHandoverStatus
};
