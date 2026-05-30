const { Order, DeliveryTask, User, DeliveryAgentProfile, PlatformConfig, Wallet, Transaction, DeliveryCharge } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../database/database');
const { matchAgentsToOrder, checkProfileCompleteness, getAgentCurrentLoad, calculateLocalityScore } = require('../utils/deliveryUtils');
const { notifyDeliveryAgentAssignment, createNotification } = require('../utils/notificationHelpers');
const { upsertDeliveryChargeForTask, invoiceSellerChargeImmediately } = require('../utils/deliveryChargeHelpers');
const { revertPending, creditPending } = require('../utils/walletHelpers');

/**
 * Smart Auto-Dispatch Service
 */
const autoDispatchService = {
    /**
     * Attempts to automatically assign a delivery agent to an order.
     * @param {number} orderId - The ID of the order to dispatch.
     * @param {object} options - Optional overrides (e.g. excludeAgentIds).
     * @returns {Promise<object|null>} The assigned task or null if no agent found.
     */
    runAutoDispatch: async (orderId, options = {}) => {
        const { excludeAgentIds = [] } = options;
        console.log(`🚀 [AutoDispatch] Starting dispatch for Order #${orderId}...`);

        const t = await sequelize.transaction();
        try {
            // 1. Fetch Order and Config
            const order = await Order.findByPk(orderId, {
                include: [
                    { model: User, as: 'seller', attributes: ['id', 'name', 'businessAddress', 'businessLat', 'businessLng'] },
                    { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }
                ],
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!order) {
                if (t) await t.rollback();
                return null;
            }

            const configRecord = await PlatformConfig.findOne({ where: { key: 'logistic_settings' }, transaction: t });
            const settings = configRecord ? (typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value) : {};

            if (!settings.autoDispatchOrders) {
                console.log(`⏸️ [AutoDispatch] Auto-dispatch is disabled in settings.`);
                if (t) await t.rollback();
                return null;
            }

            // 2. Find agents with delivery role
            const potentialAgents = await User.findAll({
                where: {
                    id: { [Op.notIn]: excludeAgentIds },
                    isDeactivated: false,
                    isFrozen: false
                },
                include: [{
                    model: DeliveryAgentProfile,
                    as: 'deliveryProfile',
                    where: { isActive: true },
                    required: true
                }],
                transaction: t
            });

            const onlineAgents = potentialAgents.filter(u => {
                const roles = Array.isArray(u.roles) ? u.roles : (typeof u.roles === 'string' ? JSON.parse(u.roles || '[]') : []);
                return u.role === 'delivery_agent' || roles.includes('delivery_agent');
            });

            console.log(`🔍 [AutoDispatch] Found ${onlineAgents.length} active delivery agents.`);

            // Log details about profile completeness for debugging
            const incompleteAgents = [];
            const completeAgents = onlineAgents.filter(agent => {
                const { isComplete, missing } = checkProfileCompleteness(agent.deliveryProfile, agent);
                if (!isComplete) {
                    incompleteAgents.push({ name: agent.name, missing });
                    return false;
                }
                return true;
            });

            if (incompleteAgents.length > 0) {
                console.log(`ℹ️ [AutoDispatch] Excluded ${incompleteAgents.length} agents with incomplete profiles:`, JSON.stringify(incompleteAgents));
            }

            if (onlineAgents.length === 0) {
                console.log(`⚠️ [AutoDispatch] No online agents available.`);
                if (t) await t.rollback();
                return null;
            }

            // 3. Filter agents who have already rejected or failed this order
            const previousAttempts = await DeliveryTask.findAll({
                where: {
                    orderId,
                    status: { [Op.in]: ['rejected', 'failed'] }
                },
                attributes: ['deliveryAgentId'],
                transaction: t
            });
            const attemptedAgentIds = previousAttempts.map(ta => ta.deliveryAgentId);
            
            // 4. Filter agents who are at capacity (Limit: 3 active tasks)
            const activeTasksCount = await DeliveryTask.findAll({
                where: {
                    status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] },
                    deliveryAgentId: { [Op.in]: onlineAgents.map(a => a.id) }
                },
                attributes: ['deliveryAgentId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['deliveryAgentId'],
                transaction: t
            });
            
            // 3. Filter agents who are at capacity (Dynamic limits based on order type)
            const isFastfoodOrder = (order.OrderItems || []).some(item => item.fastFoodId != null);
            const maxCapacity = isFastfoodOrder ? 20 : 5; // Fastfood: 20 orders, Products: 5 orders
            
            const capacityMap = {};
            activeTasksCount.forEach(row => {
                capacityMap[row.deliveryAgentId] = parseInt(row.get('count'), 10);
            });

            const eligibleAgents = completeAgents.filter(agent => {
                if (attemptedAgentIds.includes(agent.id)) return false;
                const currentLoad = capacityMap[agent.id] || 0;
                if (currentLoad >= maxCapacity) return false; // Dynamic capacity limit
                return true;
            });

            console.log(`🔍 [AutoDispatch] ${eligibleAgents.length} agents eligible (${isFastfoodOrder ? 'fastfood' : 'product'} order, max capacity: ${maxCapacity})`);

            if (eligibleAgents.length === 0) {
                console.log(`⚠️ [AutoDispatch] No eligible agents found (all rejected, at capacity, or incomplete profiles).`);
                if (t) await t.rollback();
                return null;
            }

            // 5. Smart Matching with enhanced locality scoring
            // First, populate current load for matching algorithm
            eligibleAgents.forEach(agent => {
                agent.currentLoad = capacityMap[agent.id] || 0;
            });

            const matches = matchAgentsToOrder(eligibleAgents, order);
            if (matches.length === 0) {
                console.log(`⚠️ [AutoDispatch] Matching algorithm returned no suitable agents.`);
                if (t) await t.rollback();
                return null;
            }

            // Broadcast to up to 5 top matches
            const topMatches = matches.slice(0, 5).map(m => m.agent);
            console.log(`🎯 [AutoDispatch] Broadcasting to ${topMatches.length} Agents: ${topMatches.map(a => a.name).join(', ')}`);

            // 6. Assignment Logic
            const { getProvisionalDeliveryType } = require('../controllers/deliveryController');
            const dType = getProvisionalDeliveryType(order);
            const finalFee = parseFloat(order.deliveryFee) || 0;
            
            let currentShare = 70;
            const shareConfig = await PlatformConfig.findOne({ where: { key: 'delivery_fee_agent_share' }, transaction: t });
            if (shareConfig) currentShare = parseFloat(shareConfig.value);

            const agentEarnings = finalFee * (currentShare / 100);

            // Cancel ALL existing pending (assigned/requested) tasks for this order
            const existingPendingTasks = await DeliveryTask.findAll({
                where: { orderId: order.id, status: { [Op.in]: ['assigned', 'requested'] } },
                transaction: t
            });

            for (const pendingTask of existingPendingTasks) {
                if (pendingTask.deliveryAgentId) {
                    const oldShare = parseFloat(pendingTask.agentShare) || 70;
                    const oldEarnings = (parseFloat(pendingTask.deliveryFee) || 0) * (oldShare / 100);
                    if (oldEarnings > 0) {
                        await revertPending(pendingTask.deliveryAgentId, oldEarnings, order.id, t);
                    }
                }
                await pendingTask.update({ status: 'cancelled', rejectionReason: 'Order auto-reassigned by Smart Dispatcher.' }, { transaction: t });
            }

            const createdTasks = [];

            // Create new tasks and credit pending for each agent
            for (const agent of topMatches) {
                const newTask = await DeliveryTask.create({
                    orderId: order.id,
                    deliveryAgentId: agent.id,
                    deliveryType: dType,
                    deliveryFee: finalFee,
                    agentShare: currentShare,
                    status: 'assigned',
                    assignedAt: new Date(),
                    notes: `Auto-assigned by Smart Dispatcher.`
                }, { transaction: t });
                createdTasks.push(newTask);

                if (agentEarnings > 0) {
                    await creditPending(
                        agent.id,
                        agentEarnings,
                        `Auto-assigned Delivery for Order #${order.orderNumber}`,
                        order.id,
                        t,
                        'delivery_agent'
                    );
                }
            }

            if (createdTasks.length > 0) {
                const primaryTask = createdTasks[0];
                await upsertDeliveryChargeForTask({
                    DeliveryCharge, transaction: t, order, task: primaryTask, deliveryFee: finalFee, agentSharePercent: currentShare, deliveryType: dType, deliveryAgentId: primaryTask.deliveryAgentId
                });
                await invoiceSellerChargeImmediately({
                    DeliveryCharge, Wallet, Transaction, transaction: t, task: primaryTask, order
                });
            }

            await t.commit();

            // 8. Notifications (Outside transaction)
            const { getIO } = require('../realtime/socket');
            const io = getIO();

            for (const agent of topMatches) {
                // Find the task we created for this agent
                const agentTask = createdTasks.find(t => t.deliveryAgentId === agent.id);
                
                await createNotification(
                    agent.id,
                    'New Auto-Assignment 📦',
                    `You have been auto-assigned Order #${order.orderNumber} based on your proximity and rating. Please accept quickly!`,
                    'info'
                ).catch(e => console.error(e));
                
                // Pass agentTask.id directly to avoid race condition with DB lookup
                notifyDeliveryAgentAssignment(agent, order, order.orderNumber, dType, agentTask ? agentTask.id : null)
                    .catch(err => console.error(`Notify Agent ${agent.id} Error:`, err));

                if (io) {
                    io.to(`user:${agent.id}`).emit('new_task_available', {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        deliveryType: dType,
                        autoAssigned: true
                    });
                }
            }

            if (io) {
                io.to('admin').emit('deliveryRequestUpdate', { orderId: order.id, status: 'auto_assigned' });
            }

            return createdTasks[0];

        } catch (error) {
            if (t) await t.rollback();
            console.error('❌ [AutoDispatch] Error:', error);
            return null;
        }
    }
};

module.exports = autoDispatchService;
