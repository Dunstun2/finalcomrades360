require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Order, DeliveryTask } = require('../models');
const { Op } = require('sequelize');

/**
 * Force all in-progress orders to 'delivered' status
 * and mark their delivery tasks as 'completed'
 */
async function forceDeliverAllOrders() {
    console.log('🚀 Starting force delivery of all in-progress orders...\n');

    try {
        // Find orders that are NOT in terminal states
        const inProgressStatuses = [
            'order_placed', 'seller_confirmed', 'super_admin_confirmed',
            'en_route_to_warehouse', 'at_warehouse', 'ready_for_pickup',
            'at_pick_station', 'awaiting_delivery_assignment', 'processing',
            'in_transit', 'en_route_to_pick_station'
        ];

        const ordersToDeliver = await Order.findAll({
            where: {
                status: { [Op.in]: inProgressStatuses }
            },
            order: [['createdAt', 'DESC']]
        });

        if (ordersToDeliver.length === 0) {
            console.log('✅ No in-progress orders found. All orders are already in terminal states.');
            return;
        }

        console.log(`📋 Found ${ordersToDeliver.length} in-progress orders to deliver:\n`);
        ordersToDeliver.forEach((o, idx) => {
            console.log(`  ${idx + 1}. Order #${o.orderNumber} (ID: ${o.id}) - Current Status: ${o.status}`);
        });
        console.log();

        let successCount = 0;
        let failureCount = 0;

        for (const order of ordersToDeliver) {
            try {
                // 1. Complete any active delivery tasks for this order
                const activeTasks = await DeliveryTask.findAll({
                    where: {
                        orderId: order.id,
                        status: { [Op.notIn]: ['completed', 'failed', 'rejected', 'cancelled'] }
                    }
                });

                for (const task of activeTasks) {
                    await task.update({
                        status: 'completed',
                        completedAt: new Date()
                    });
                    console.log(`  ✓ Task #${task.id} marked as completed`);
                }

                // 2. Update order to delivered
                const now = new Date();
                await order.update({
                    status: 'delivered',
                    actualDelivery: order.actualDelivery || now,
                    pickedUpAt: order.pickedUpAt || now,
                    deliveryAgentId: null
                });

                console.log(`✅ Order #${order.orderNumber} (ID: ${order.id}) → DELIVERED\n`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to deliver order #${order.orderNumber}:`, error.message);
                failureCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`🎉 Delivery Force Complete!`);
        console.log(`   Success: ${successCount}/${ordersToDeliver.length}`);
        if (failureCount > 0) console.log(`   Failed: ${failureCount}/${ordersToDeliver.length}`);
        console.log('='.repeat(60));

        // Summary of delivered orders
        const deliveredOrders = await Order.findAll({
            where: { status: 'delivered' },
            attributes: ['id', 'orderNumber', 'actualDelivery', 'total'],
            order: [['actualDelivery', 'DESC']],
            limit: 5
        });

        if (deliveredOrders.length > 0) {
            console.log('\n📦 Recently Delivered Orders:');
            deliveredOrders.forEach(o => {
                const deliveryDate = o.actualDelivery ? new Date(o.actualDelivery).toLocaleString() : 'N/A';
                console.log(`   Order #${o.orderNumber} - Total: KES ${o.total} - Delivered: ${deliveryDate}`);
            });
        }

    } catch (error) {
        console.error('❌ Fatal error in forceDeliverAllOrders:', error);
        process.exit(1);
    }
}

// Support manual execution from command line
if (require.main === module) {
    forceDeliverAllOrders().then(() => {
        console.log('\n✨ Force delivery complete.');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Manual run failed:', err);
        process.exit(1);
    });
}

module.exports = { forceDeliverAllOrders };
