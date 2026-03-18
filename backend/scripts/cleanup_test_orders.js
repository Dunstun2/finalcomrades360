const { Order, OrderItem, DeliveryTask, Transaction, Commission } = require('../models');
const { Op } = require('sequelize');

async function cleanupTestData() {
    console.log('--- Cleaning up Test Orders and associated data ---');
    
    try {
        // Find all orders starting with REAL-TEST-SET- or TEST-LOC-00
        const orders = await Order.findAll({
            where: {
                orderNumber: { 
                    [Op.or]: [
                        { [Op.like]: 'REAL-TEST-SET-%' },
                        { [Op.like]: 'TEST-LOC-00%' }
                    ]
                }
            }
        });

        const orderIds = orders.map(o => o.id);

        if (orderIds.length === 0) {
            console.log('No test orders found.');
            process.exit(0);
        }

        console.log(`Found ${orderIds.length} test orders. Deleting associations...`);

        // Delete associated records
        await OrderItem.destroy({ where: { orderId: orderIds } });
        await DeliveryTask.destroy({ where: { orderId: orderIds } });
        await Transaction.destroy({ where: { orderId: orderIds } });
        await Commission.destroy({ where: { orderId: orderIds } });

        // Finally delete the orders
        const deletedCount = await Order.destroy({ where: { id: orderIds } });
        
        console.log(`✅ Successfully deleted ${deletedCount} test orders and their associated data.`);
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanupTestData();
