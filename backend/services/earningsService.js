const { DeliveryTask, Order, DeliveryAgentProfile, Wallet, Transaction, DeliveryCharge, PlatformConfig, Warehouse, PickupStation, sequelize, User } = require('../models');
const { creditPending, moveToSuccess } = require('../utils/walletHelpers');
const { upsertDeliveryChargeForTask, settleDeliveryChargeForTask } = require('../utils/deliveryChargeHelpers');

/**
 * Credits the delivery agent for a specific task.
 * Can be called when payment is confirmed (COD) or when task is completed.
 */
const creditAgentForTask = async (taskId, transaction = null) => {
    const t = transaction || await sequelize.transaction();

    try {
        const task = await DeliveryTask.findByPk(taskId, {
            include: [{ model: Order, as: 'order' }],
            transaction: t
        });

        if (!task || !task.order) {
            console.error(`[earningsService] Task ${taskId} or associated order not found.`);
            if (!transaction) await t.rollback();
            return false;
        }

        // Check if already credited
        if (task.agentEarnings > 0 && task.status === 'completed') {
            console.log(`[earningsService] Task ${taskId} already settled.`);
            if (!transaction) await t.rollback();
            return true;
        }

        const order = task.order;
        const agentId = task.deliveryAgentId;

        if (!agentId) {
            console.log(`[earningsService] No agent assigned to task ${taskId}.`);
            if (!transaction) await t.rollback();
            return false;
        }

        // Use the share percentage LOCKED at assignment time (task.agentShare).
        const sharePercent = parseFloat(task.agentShare) || 70;
        const baseFee = parseFloat(task.deliveryFee) || 0;
        const agentEarnings = baseFee * (sharePercent / 100);

        console.log(`[earningsService] Crediting agent ${agentId} for task ${taskId}. Amount: ${agentEarnings}`);

        // Update task with earnings
        await task.update({
            agentEarnings: agentEarnings,
            deliveryFee: baseFee
        }, { transaction: t });

        // Update agent profile stats
        const profile = await DeliveryAgentProfile.findOne({ where: { userId: agentId }, transaction: t });
        if (profile) {
            await profile.update({
                totalEarnings: sequelize.literal(`totalEarnings + ${agentEarnings}`)
            }, { transaction: t });
        }

        // WALLET INTEGRATION
        if (agentEarnings > 0) {
            // We move directly to success balance because payment is already confirmed
            // (either pre-paid or COD just confirmed)
            await moveToSuccess(
                agentId,
                agentEarnings,
                order.orderNumber,
                `Delivery Earning for Order #${order.orderNumber} (Payment Confirmed)`,
                order.id,
                t,
                'delivery_agent'
            );
        }

        // Update DeliveryCharge records
        const charge = await upsertDeliveryChargeForTask({
            DeliveryCharge,
            PlatformConfig,
            transaction: t,
            order,
            task,
            deliveryFee: baseFee,
            agentSharePercent: sharePercent,
            deliveryType: task.deliveryType,
            deliveryAgentId: agentId
        });

        // 6. STATION/WAREHOUSE MANAGER CREDIT
        if (charge && charge.stationAmount > 0 && charge.stationId) {
            let managerId = null;
            let stationName = 'Station';

            if (charge.stationType === 'warehouse') {
                const warehouse = await Warehouse.findByPk(charge.stationId, { transaction: t });
                managerId = warehouse?.managerId;
                stationName = warehouse?.name || 'Warehouse';
            } else if (charge.stationType === 'pickup_station') {
                const station = await PickupStation.findByPk(charge.stationId, { transaction: t });
                managerId = station?.managerId;
                stationName = station?.name || 'Pickup Station';
            }

            if (managerId) {
                console.log(`[earningsService] Crediting manager ${managerId} of ${stationName} for task ${taskId}. Amount: ${charge.stationAmount}`);
                await moveToSuccess(
                    managerId,
                    charge.stationAmount,
                    order.orderNumber,
                    `Station Handling Fee for Order #${order.orderNumber} at ${stationName}`,
                    order.id,
                    t,
                    'station_manager'
                );
            } else {
                console.warn(`[earningsService] No managerId found for station ${charge.stationId} (${charge.stationType}). Skipping station credit.`);
            }
        }

        await settleDeliveryChargeForTask({
            DeliveryCharge,
            transaction: t,
            taskId: task.id,
            markCharged: true
        });

        if (!transaction) await t.commit();
        return true;
    } catch (error) {
        console.error(`[earningsService] Error crediting agent/manager for task ${taskId}:`, error);
        if (!transaction) await t.rollback();
        throw error;
    }
};

/**
 * Convenience method to credit agent by orderId.
 * Finds the latest active delivery task for the order.
 */
const creditAgentByOrder = async (orderId, transaction = null) => {
    const task = await DeliveryTask.findOne({
        where: {
            orderId,
            status: ['assigned', 'accepted', 'in_progress', 'arrived_at_pickup']
        },
        order: [['createdAt', 'DESC']],
        transaction
    });

    if (task) {
        return creditAgentForTask(task.id, transaction);
    }
    return false;
};

module.exports = {
    creditAgentForTask,
    creditAgentByOrder
};
