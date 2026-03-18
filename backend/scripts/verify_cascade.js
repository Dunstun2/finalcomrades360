const { User, Order, OrderItem, sequelize } = require('../models');

async function testCascade() {
    console.log('--- Testing Cascading Delete ---');
    try {
        // 1. Create a dummy order
        const order = await Order.create({
            userId: 2, // evellahwambutsi@gmail.com
            orderNumber: 'TEST-CASCADE-' + Date.now(),
            total: 100,
            paymentMethod: 'mpesa',
            items: 1
        });
        
        console.log(`Created test order ${order.id}`);
        
        // 2. Create associated item
        const item = await OrderItem.create({
            orderId: order.id,
            name: 'Test Cascade Item',
            price: 100,
            quantity: 1,
            total: 100
        });
        
        console.log(`Created test order item ${item.id}`);
        
        // 3. Delete order
        await order.destroy();
        console.log(`Deleted order ${order.id}`);
        
        // 4. Check if item still exists
        const foundItem = await OrderItem.findByPk(item.id);
        if (foundItem) {
            console.error('❌ FAILURE: OrderItem still exists after order deletion!');
        } else {
            console.log('✅ SUCCESS: OrderItem was automatically deleted with the order.');
        }
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

testCascade().then(() => process.exit(0));
