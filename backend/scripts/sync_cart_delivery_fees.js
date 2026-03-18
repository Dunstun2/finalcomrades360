const { Cart, FastFood, sequelize } = require('../models');

async function syncCartFees() {
    try {
        console.log('--- Starting Cart Delivery Fee Synchronization ---');
        
        const cartItems = await Cart.findAll({
            where: { itemType: 'fastfood' },
            include: [{ model: FastFood, as: 'fastFood' }]
        });

        console.log(`Found ${cartItems.length} fastfood items in carts.`);
        
        let updatedCount = 0;
        for (const item of cartItems) {
            if (item.fastFood && item.fastFood.deliveryFee !== null && item.fastFood.deliveryFee !== undefined) {
                const liveFee = Number(item.fastFood.deliveryFee);
                if (Number(item.deliveryFee) !== liveFee) {
                    await item.update({ deliveryFee: liveFee });
                    console.log(`Updated Cart ID ${item.id} (${item.fastFood.name}): ${item.deliveryFee} -> ${liveFee}`);
                    updatedCount++;
                }
            }
        }

        console.log(`Sync complete. Updated ${updatedCount} cart items.`);

    } catch (error) {
        console.error('Sync failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncCartFees();
