const { Product } = require('../models');
const { Op } = require('sequelize');

async function reclassifyServiceProducts() {
    console.log('--- Reclassifying Service Products in Product Table ---');
    
    try {
        // Target: Category 11 (Repairs & Tech) and 15 (Student Services)
        const products = await Product.findAll({
            where: {
                categoryId: [11, 15]
            }
        });

        console.log(`Found ${products.length} products to reclassify.`);

        // New Category: 16 (Campus Life)
        // New Subcategory: 96 (Promotions)
        
        for (const product of products) {
            console.log(`Updating: ${product.name}`);
            await product.update({
                categoryId: 16,
                subcategoryId: 96
            });
        }

        console.log('\n--- Reclassification Complete ---');
        console.log(`Successfully moved ${products.length} items to Category 16 (Campus Life).`);
        process.exit(0);
    } catch (err) {
        console.error('Reclassification failed:', err);
        process.exit(1);
    }
}

reclassifyServiceProducts();
