const { User, Order } = require('../models');
const { Op } = require('sequelize');

async function checkRealOrders() {
    try {
        console.log('--- 🔍 Checking Real Available Orders and Seller Locations ---');

        const availableOrders = await Order.findAll({
            where: {
                deliveryAgentId: null,
                orderNumber: { [Op.notLike]: 'SCALED-TEST%' } // Skip test data
            },
            include: [{ model: User, as: 'seller' }]
        });

        console.log(`Found ${availableOrders.length} real unassigned orders.`);

        for (const order of availableOrders) {
            const seller = order.seller;
            console.log(`\nOrder: ${order.orderNumber} (Status: ${order.status})`);
            if (seller) {
                console.log(`  Seller: ${seller.name}`);
                console.log(`  Town: ${seller.businessTown}`);
                console.log(`  Lat/Lng: ${seller.businessLat}, ${seller.businessLng}`);
                const hasLocation = !!(seller.businessLat && seller.businessLng) || !!seller.businessTown;
                console.log(`  Has Location Info: ${hasLocation ? '✅' : '❌'}`);
            } else {
                console.log('  ❌ No seller!');
            }
        }

    } catch (err) {
        console.error(err);
    }
}

checkRealOrders().then(() => process.exit());
