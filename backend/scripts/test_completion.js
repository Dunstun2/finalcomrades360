const { Order } = require('../models');
const { autoCompleteOrders } = require('./complete_orders_task');
const { sequelize } = require('../database/database');

async function testCompletion() {
    try {
        console.log('🧪 Starting test for Order Auto-Completion...');

        // 1. Create a mock order in 'delivered' status with an old actualDelivery date
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

        const testOrder = await Order.create({
            userId: 1, // Assumes a user with ID 1 exists
            orderNumber: `TEST-COMP-${Date.now()}`,
            total: 100,
            status: 'delivered',
            paymentMethod: 'mpesa',
            actualDelivery: oldDate,
            items: 1
        });

        console.log(`✅ Created test order: ${testOrder.orderNumber} with delivery date: ${testOrder.actualDelivery.toISOString()}`);

        // 2. Run the completion task
        await autoCompleteOrders();

        // 3. Verify the status change
        const updatedOrder = await Order.findByPk(testOrder.id);
        if (updatedOrder.status === 'completed') {
            console.log('🎉 Test PASSED: Order successfully transitioned to "completed".');
        } else {
            console.log(`❌ Test FAILED: Order status is still "${updatedOrder.status}".`);
        }

        // Cleanup
        await testOrder.destroy();
        console.log('🧹 Cleaned up test data.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test execution error:', error.message);
        process.exit(1);
    }
}

testCompletion();
