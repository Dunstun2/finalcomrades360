const { Cart, FastFood, sequelize } = require('../models');

async function checkCartFees() {
    try {
        const cartItems = await Cart.findAll({
            where: { itemType: 'fastfood' },
            include: [{ model: FastFood, as: 'fastFood' }]
        });

        console.log('--- Current Cart Items (FastFood) ---');
        cartItems.forEach(item => {
            console.log(`Cart ID: ${item.id}`);
            console.log(`  Item: ${item.fastFood?.name || 'Unknown'}`);
            console.log(`  Vendor: ${item.fastFood?.vendor}`);
            console.log(`  Cart stored deliveryFee: ${item.deliveryFee}`);
            console.log(`  FastFood live deliveryFee: ${item.fastFood?.deliveryFee}`);
            console.log('---');
        });

    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

checkCartFees();
