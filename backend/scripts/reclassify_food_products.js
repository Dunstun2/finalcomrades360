const { Product } = require('../models');
const { Op } = require('sequelize');

async function reclassifyFoodProducts() {
    console.log('--- Reclassifying Food Products in Product Table ---');
    
    try {
        // Target: Category 9 (Food & Drinks) or Subcategory 21 (Fast Food)
        const products = await Product.findAll({
            where: {
                [Op.or]: [
                    { categoryId: 9 },
                    { subcategoryId: 21 }
                ]
            }
        });

        console.log(`Found ${products.length} products to reclassify.`);

        // New Category: 16 (Campus Life)
        // New Subcategory: 96 (Promotions)
        // These are safe placeholders that won't trigger "Fast Food" logic in the frontend/backend
        
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

reclassifyFoodProducts();
