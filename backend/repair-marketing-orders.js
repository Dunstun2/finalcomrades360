const { sequelize } = require('./database/database');
const { Order, OrderItem, Product, FastFood } = require('./models');
const { calculateItemCommission } = require('./utils/commissionUtils');
const { Op } = require('sequelize');

async function repairOrders() {
    try {
        console.log('🔄 Starting Repair process...');
        await sequelize.authenticate();

        // 1. Fix checkoutOrderNumber for orders from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ordersToFix = await Order.findAll({
            where: {
                createdAt: { [Op.gte]: today },
                checkoutOrderNumber: null
            }
        });

        console.log(`🔍 Found ${ordersToFix.length} orders lacking checkoutOrderNumber.`);
        for (const order of ordersToFix) {
            // ORD-1772724393137-5-1034 -> ORD-1772724393137-5
            const parts = order.orderNumber.split('-');
            if (parts.length >= 3) {
                const checkoutOrderNumber = parts.slice(0, 3).join('-');
                await order.update({ checkoutOrderNumber });
                console.log(`✅ Fixed order ${order.orderNumber} -> ${checkoutOrderNumber}`);
            }
        }

        // 2. Fix commissionAmount for OrderItems from today
        const itemsToFix = await OrderItem.findAll({
            where: {
                createdAt: { [Op.gte]: today },
                [Op.or]: [
                    { commissionAmount: 0 },
                    { commissionAmount: null }
                ]
            },
            include: [
                { model: Product, as: 'Product' },
                { model: FastFood, as: 'FastFood' }
            ]
        });

        console.log(`🔍 Found ${itemsToFix.length} OrderItems lacking commissionAmount.`);
        for (const item of itemsToFix) {
            const product = item.Product || item.FastFood;
            if (product) {
                const commission = calculateItemCommission(product, item.price, item.quantity);
                if (commission > 0) {
                    await item.update({ commissionAmount: commission });
                    console.log(`✅ Calculated commission for ${item.name}: ${commission}`);
                }
            }
        }

        console.log('✨ Repair complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Repair failed:', err);
        process.exit(1);
    }
}

repairOrders();
