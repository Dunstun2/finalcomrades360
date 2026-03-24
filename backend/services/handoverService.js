const { HandoverCode, Order, DeliveryTask, User, Wallet, Transaction, Commission, OrderItem, Product, FastFood, Service, ReturnRequest, sequelize, Op } = require('../models');
const { creditAgentForTask } = require('./earningsService');
const { moveToSuccess } = require('../utils/walletHelpers');
const { SELLER_PAID_ROUTE_TYPES, calculateSellerMerchandisePayout } = require('../utils/deliveryChargeHelpers');

/**
 * Common logic for confirming a handover code.
 * Used by the controller (customer entry) and the auto-completion background task.
 */
const confirmHandoverProcessor = async (codeId, confirmerId, notes = null, transaction = null) => {
    const t = transaction || await sequelize.transaction();

    try {
        const handover = await HandoverCode.findByPk(codeId, {
            include: [
                { model: Order, as: 'order' },
                { model: DeliveryTask, as: 'task' }
            ],
            transaction: t
        });

        if (!handover) {
            console.error(`[handoverService] Handover code ${codeId} not found.`);
            if (!transaction) await t.rollback();
            return { success: false, message: 'Handover code not found' };
        }

        if (handover.status !== 'pending') {
            console.log(`[handoverService] Handover code ${codeId} already ${handover.status}`);
            if (!transaction) await t.rollback();
            return { success: true, message: `Handover already ${handover.status}` };
        }

        const { handoverType, orderId, taskId } = handover;
        const order = handover.order;
        const task = handover.task;

        console.log(`[handoverService] Processing handover confirmation: Type=${handoverType}, Order=${orderId}, Task=${taskId || 'none'}`);

        // 1. Update HandoverCode status
        await handover.update({
            status: 'confirmed',
            confirmerId,
            confirmedAt: new Date(),
            notes: notes || handover.notes
        }, { transaction: t });

        // 2. Define Status Transitions (Logic from handoverController.HANDOVER_TRANSITIONS)
        let nextOrderStatus = order.status;
        let nextTaskStatus = task?.status;

        switch (handoverType) {
            case 'seller_to_agent':
                nextOrderStatus = 'shipped';
                nextTaskStatus = 'in_progress';
                break;
            case 'agent_to_warehouse':
            case 'seller_to_warehouse':
                nextOrderStatus = 'at_warehouse';
                nextTaskStatus = 'completed';
                break;
            case 'warehouse_to_agent':
                nextOrderStatus = 'shipped';
                nextTaskStatus = 'in_progress';
                break;
            case 'agent_to_station':
                nextOrderStatus = 'at_pick_station';
                nextTaskStatus = 'completed';
                break;
            case 'station_to_agent':
                nextOrderStatus = 'shipped';
                nextTaskStatus = 'in_progress';
                break;
            case 'agent_to_customer':
            case 'station_to_customer':
                nextOrderStatus = 'delivered';
                nextTaskStatus = 'completed';
                break;
            case 'customer_to_agent':
                nextOrderStatus = 'en_route_to_warehouse';
                nextTaskStatus = 'in_progress';
                break;
            case 'customer_to_station':
                nextOrderStatus = 'at_pick_station';
                nextTaskStatus = 'completed';
                break;
        }

        // 3. Update Order and Task
        const orderUpdates = {
            status: nextOrderStatus,
            actualDelivery: nextOrderStatus === 'delivered' ? new Date() : order.actualDelivery,
            paymentConfirmed: (nextOrderStatus === 'delivered') ? true : order.paymentConfirmed
        };

        if (['at_warehouse', 'received_at_warehouse', 'at_pick_station'].includes(nextOrderStatus)) {
            orderUpdates.deliveryType = null;
            orderUpdates.deliveryAgentId = null;
        } else if (nextOrderStatus === 'delivered' || nextOrderStatus === 'returned') {
            orderUpdates.deliveryAgentId = null;
        }

        await order.update(orderUpdates, { transaction: t });

        // Clean up hanging tasks if a leg just finished at a hub or destination
        if (['at_warehouse', 'received_at_warehouse', 'at_pick_station', 'delivered', 'returned'].includes(nextOrderStatus)) {
            await DeliveryTask.update(
                { 
                    status: 'completed',
                    completedAt: new Date(),
                    agentNotes: `Auto-completed by handover progression to ${nextOrderStatus}`
                },
                { 
                    where: { 
                        orderId: order.id, 
                        status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] },
                        ...(task ? { id: { [Op.ne]: task.id } } : {}) // Don't interfere with the active task being explicitly handled below
                    },
                    transaction: t
                }
            );
        }

        if (task) {
            await task.update({
                status: nextTaskStatus,
                completedAt: nextTaskStatus === 'completed' ? new Date() : null
            }, { transaction: t });

            // 4. Handle Earnings and Logistics Deductions
            if (nextTaskStatus === 'completed') {
                // Agent Earnings
                await creditAgentForTask(task.id, t);

                // Seller Deductions for logistics legs (Seller-Paid)
                if (SELLER_PAID_ROUTE_TYPES.has(handoverType)) {
                    const sellerId = order.sellerId;
                    const baseFee = parseFloat(task.deliveryFee) || 0;
                    if (sellerId && baseFee > 0) {
                        let sellerWallet = await Wallet.findOne({ where: { userId: sellerId }, transaction: t });
                        if (!sellerWallet) {
                            sellerWallet = await Wallet.create({ userId: sellerId, balance: 0 }, { transaction: t });
                        }
                        await sellerWallet.update({ balance: (sellerWallet.balance || 0) - baseFee }, { transaction: t });
                        await Transaction.create({
                            userId: sellerId,
                            amount: baseFee,
                            type: 'debit',
                            status: 'completed',
                            description: `Logistics Fee (${handoverType}) for Order #${order.orderNumber}`,
                            orderId: order.id
                        }, { transaction: t });
                    }
                }
            }
        }

        // 5. Final Payouts (Seller & Marketer) when Order is Delivered
        if (nextOrderStatus === 'delivered') {
            // Seller Sale Earning
            const sellerId = order.sellerId;
            if (sellerId) {
                // Need items for correct calculation
                const items = await OrderItem.findAll({ 
                    where: { orderId: order.id },
                    include: [
                        { model: Product, attributes: ['id', 'name'], required: false },
                        { model: FastFood, attributes: ['id', 'name'], required: false },
                        { model: Service, attributes: ['id', 'title'], required: false }
                    ],
                    transaction: t 
                });
                const sellerAmount = calculateSellerMerchandisePayout(order, items);
                await moveToSuccess(sellerId, sellerAmount, order.orderNumber, 'Sale Earning', order.id, t);
            }

            // Marketer Commissions
            const commissions = await Commission.findAll({ where: { orderId: order.id }, transaction: t });
            for (const comm of commissions) {
                await moveToSuccess(comm.marketerId, comm.commissionAmount, order.orderNumber, 'Commission Earning', order.id, t);
                await comm.update({ status: 'success' }, { transaction: t });
            }
        }

        // 6. Handle ReturnRequest status updates
        try {
            const activeReturn = await ReturnRequest.findOne({ 
                where: { orderId: order.id, status: ['pending', 'approved', 'item_collected'] },
                transaction: t 
            });
            if (activeReturn) {
                if (handoverType === 'customer_to_agent' || handoverType === 'customer_to_station') {
                    await activeReturn.update({ status: 'item_collected' }, { transaction: t });
                } else if (nextOrderStatus === 'at_warehouse' && ['agent_to_warehouse', 'seller_to_warehouse'].includes(handoverType)) {
                    // If it was a return leg ending at warehouse
                    if (activeReturn.status === 'item_collected') {
                        await activeReturn.update({ status: 'item_received' }, { transaction: t });
                    }
                }
            }
        } catch (returnErr) {
            console.warn('[handoverService] Failed to update ReturnRequest status:', returnErr.message);
        }

        if (!transaction) await t.commit();
        
        console.log(`[handoverService] Handover ${codeId} confirmed successfully.`);
        return { success: true, message: 'Handover confirmed' };

    } catch (error) {
        console.error(`[handoverService] Error confirming handover ${codeId}:`, error);
        if (!transaction) await t.rollback();
        throw error;
    }
};

module.exports = {
    confirmHandoverProcessor
};
