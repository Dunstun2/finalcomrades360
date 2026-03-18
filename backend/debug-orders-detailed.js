const { sequelize } = require('./database/database');
const { Order, OrderItem, Product, FastFood } = require('./models');
const { Op } = require('sequelize');

async function debugSpecificOrders() {
    try {
        await sequelize.authenticate();
        const orderNumbers = [
            'ORD-1772724393137-5-1034',
            'ORD-1772724393137-5-1027',
            'ORD-1772724393137-5-1008',
            'ORD-1772724393137-5-1005',
            'ORD-1772724393137-5-2',
            'ORD-1772723015801-206-1109' // One more from my previous test
        ];

        const orders = await Order.findAll({
            where: { orderNumber: { [Op.in]: orderNumbers } },
            include: [{
                model: OrderItem,
                as: 'OrderItems',
                include: [
                    { model: Product, as: 'Product' },
                    { model: FastFood, as: 'FastFood' }
                ]
            }]
        });

        console.log('--- DEBUG RESULTS ---');
        orders.forEach(o => {
            console.log(`Order: ${o.orderNumber} | Checkout: ${o.checkoutOrderNumber} | Items: ${o.OrderItems.length}`);
            o.OrderItems.forEach(item => {
                const prod = item.Product || item.FastFood;
                console.log(`  - Item: ${item.name} | Comm: ${item.commissionAmount} | ProdID: ${item.productId || item.fastFoodId} | MarketingEnabled: ${prod?.marketingEnabled} | CommType: ${prod?.marketingCommissionType} | CommRate: ${prod?.marketingCommission}`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugSpecificOrders();
