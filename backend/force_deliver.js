const { Order, DeliveryTask, sequelize } = require('./models');

async function forceDeliverAll() {
    try {
        console.log('🚀 Starting Force Deliver script...');
        
        // Find all non-terminal orders
        const terminalStatuses = ['delivered', 'completed', 'cancelled', 'failed', 'returned'];
        const orders = await Order.findAll({
            where: {
                status: {
                    [require('sequelize').Op.notIn]: terminalStatuses
                }
            }
        });

        console.log(`📦 Found ${orders.length} orders to deliver.`);

        for (const order of orders) {
            console.log(`🔄 Processing Order #${order.id} (${order.orderNumber})...`);
            
            // 1. Update Order status
            await order.update({
                status: 'delivered',
                paymentConfirmed: true, // Auto-confirm payment for COD if delivering
                actualDelivery: new Date()
            });

            // 2. Update all associated delivery tasks to completed
            const tasks = await DeliveryTask.findAll({ where: { orderId: order.id } });
            for (const task of tasks) {
                if (task.status !== 'completed') {
                    await task.update({
                        status: 'completed',
                        completedAt: new Date(),
                        collectedAt: task.collectedAt || new Date(), // Ensure it looks collected
                        arrivedAt: task.arrivedAt || new Date()
                    });
                }
            }
            console.log(`✅ Order #${order.id} marked as delivered.`);
        }

        console.log('✨ All orders processed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during force delivery:', err);
        process.exit(1);
    }
}

forceDeliverAll();
