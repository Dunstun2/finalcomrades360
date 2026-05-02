const cron = require('node-cron');
const { Order, OrderItem, User } = require('../models');
const { Op } = require('sequelize');
const { notifyCustomerOrderThankYou } = require('../utils/notificationHelpers');

/**
 * Marketing Automation Service
 * This service handles daily automated marketing tasks like "Thank You" messages.
 */

const startMarketingAutomation = () => {
    console.log('🚀 Marketing Automation Service started');

    // Run every day at 12:00 AM (00:00)
    // Format: minute hour dayOfMonth month dayOfWeek
    cron.schedule('0 0 * * *', async () => {
        console.log('[Marketing Automation] Running daily "Thank You" messages task...');
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Fetch all orders delivered today
            const orders = await Order.findAll({
                where: {
                    status: 'delivered',
                    thankYouSent: { [Op.not]: true },
                    [Op.or]: [
                        {
                            actualDelivery: {
                                [Op.between]: [startOfDay, endOfDay]
                            }
                        },
                        {
                            [Op.and]: [
                                { actualDelivery: null },
                                {
                                    updatedAt: {
                                        [Op.between]: [startOfDay, endOfDay]
                                    }
                                }
                            ]
                        }
                    ]
                },
                include: [
                    { model: User, as: 'user' },
                    { model: OrderItem, as: 'OrderItems', limit: 1 }
                ]
            });

            console.log(`[Marketing Automation] Found ${orders.length} delivered orders today.`);

            for (const order of orders) {
                if (order.thankYouSent) continue; // Skip if already sent

                try {
                    const itemType = order.OrderItems?.[0]?.itemType || 'product';
                    await notifyCustomerOrderThankYou(order, itemType);
                    order.thankYouSent = true;
                    await order.save();
                } catch (err) {
                    console.error(`[Marketing Automation] Failed to send thank you for order ${order.orderNumber}:`, err.message);
                }
            }
            
            console.log('[Marketing Automation] Daily "Thank You" messages task completed.');
        } catch (error) {
            console.error('[Marketing Automation] Critical error in daily task:', error);
        }
    });
};

module.exports = { startMarketingAutomation };
