const { sum } = require('lodash');
const { Order } = require('../models');
const { Op } = require('sequelize');

/**
 * Automatically move orders from 'delivered' to 'completed' status
 * after a 7-day return period has elapsed.
 * 
 * Target: status = 'delivered' AND actualDelivery <= 7 days ago
 */
async function autoCompleteOrders() {
    console.log('[Task] Starting auto-completion of delivered orders...');

    try {
        // Calculate the threshold date (7 days ago)
        const returnPeriodDays = 7;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - returnPeriodDays);

        console.log(`[Task] Threshold Date for completion: ${thresholdDate.toISOString()}`);

        // Find delivered orders past the return period
        const ordersToComplete = await Order.findAll({
            where: {
                status: 'delivered',
                actualDelivery: {
                    [Op.lte]: thresholdDate,
                    [Op.ne]: null
                }
            }
        });

        if (ordersToComplete.length === 0) {
            console.log('[Task] No orders found to complete.');
            return;
        }

        console.log(`[Task] Found ${ordersToComplete.length} orders to complete.`);

        // Batch update to 'completed'
        // We'll update individually to trigger any model hooks if needed, 
        // but for volume, we'll use a transaction/bulk update if performance is key.
        let successCount = 0;
        for (const order of ordersToComplete) {
            try {
                await order.update({ status: 'completed' });
                successCount++;
                console.log(`[Task] Order #${order.orderNumber} marked as COMPLETED.`);
            } catch (updateError) {
                console.error(`[Task] Failed to complete order #${order.orderNumber}:`, updateError.message);
            }
        }

        console.log(`[Task] Auto-completion finished. Success: ${successCount}/${ordersToComplete.length}`);
    } catch (error) {
        console.error('[Task] Fatal error in autoCompleteOrders:', error);
    }
}

// Support manual execution from command line
if (require.main === module) {
    autoCompleteOrders().then(() => {
        console.log('[Task] Manual run complete.');
        process.exit(0);
    }).catch(err => {
        console.error('[Task] Manual run failed:', err);
        process.exit(1);
    });
}

module.exports = { autoCompleteOrders };
