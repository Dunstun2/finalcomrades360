const { FastFood, sequelize } = require('../models');
const { Op } = require('sequelize');

async function getFees() {
    try {
        const itemNames = ['ugali', 'Drinks', 'Crispy', 'Chipo'];
        const items = await FastFood.findAll({
            where: {
                name: {
                    [Op.or]: itemNames.map(name => ({ [Op.like]: `%${name}%` }))
                }
            }
        });

        console.log('--- Delivery Fees ---');
        if (items.length === 0) {
            console.log('No items found matching those names.');
        } else {
            items.forEach(item => {
                console.log(`Item: ${item.name}`);
                console.log(`  ID: ${item.id}`);
                console.log(`  Vendor ID: ${item.vendor}`);
                console.log(`  Delivery Fee: ${item.deliveryFee}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

getFees();
