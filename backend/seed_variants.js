const { Product, ProductVariant, Category, sequelize } = require('./models');
const { v4: uuidv4 } = require('uuid');

async function seedVariants() {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    
    // Fetch all products
    const products = await Product.findAll({ transaction });
    console.log(`Found ${products.length} products to update with variants.`);

    const variantTemplates = {
      // Electronics (ID: 1)
      1: [
        { 
          name: 'Storage', 
          type: 'custom', 
          options: [
            { value: '128GB', priceModifier: 0, stockPercent: 0.4 },
            { value: '256GB', priceModifier: 15000, stockPercent: 0.4 },
            { value: '512GB', priceModifier: 35000, stockPercent: 0.2 }
          ]
        },
        {
          name: 'Color',
          type: 'color',
          options: [
            { value: 'Titanium Gray', priceModifier: 0, stockPercent: 0.5 },
            { value: 'Deep Black', priceModifier: 0, stockPercent: 0.5 }
          ]
        }
      ],
      // Fashion (ID: 2)
      2: [
        {
          name: 'Size',
          type: 'size',
          options: [
            { value: 'Small', priceModifier: 0, stockPercent: 0.2 },
            { value: 'Medium', priceModifier: 0, stockPercent: 0.4 },
            { value: 'Large', priceModifier: 0, stockPercent: 0.3 },
            { value: 'XL', priceModifier: 200, stockPercent: 0.1 }
          ]
        },
        {
          name: 'Color',
          type: 'color',
          options: [
            { value: 'Classic White', priceModifier: 0, stockPercent: 0.4 },
            { value: 'Navy Blue', priceModifier: 0, stockPercent: 0.3 },
            { value: 'Slate Gray', priceModifier: 0, stockPercent: 0.3 }
          ]
        }
      ],
      // Default for other categories
      'default': [
        {
          name: 'Pack Size',
          type: 'custom',
          options: [
            { value: 'Single Pack', priceModifier: 0, stockPercent: 0.6 },
            { value: 'Duo Pack (Save 10%)', priceModifier: -0.1, isPercentage: true, stockPercent: 0.4 }
          ]
        }
      ]
    };

    let count = 0;
    for (const product of products) {
      const catId = product.categoryId;
      const templates = variantTemplates[catId] || variantTemplates['default'];
      
      const productVariantsJson = [];
      
      // Clear existing variants in ProductVariant table for this product
      await ProductVariant.destroy({ where: { productId: product.id }, transaction });

      for (const template of templates) {
        const variantOptions = [];
        const optionDetails = {};

        for (const opt of template.options) {
          const optValue = opt.value;
          variantOptions.push(optValue);

          const basePrice = product.basePrice;
          const displayPrice = product.displayPrice || basePrice;
          
          let modPrice = opt.priceModifier || 0;
          if (opt.isPercentage) {
            modPrice = basePrice * opt.priceModifier;
          }

          const finalBase = Math.round(basePrice + modPrice);
          const finalDisplay = Math.round(displayPrice + modPrice);
          const finalDiscount = Math.round(finalDisplay * (1 - (product.discountPercentage || 0) / 100));
          const optStock = Math.floor((product.stock || 100) * opt.stockPercent);

          optionDetails[optValue] = {
            basePrice: finalBase.toString(),
            displayPrice: finalDisplay.toString(),
            discountPercentage: (product.discountPercentage || 0).toString(),
            discountPrice: finalDiscount.toString(),
            stock: optStock.toString(),
            sku: `${product.sku}-${optValue.replace(/\s+/g, '-').toUpperCase()}`
          };
        }

        // Add to JSON structure
        productVariantsJson.push({
          name: template.name,
          options: variantOptions,
          optionDetails: optionDetails
        });

        // Add to ProductVariant table
        await ProductVariant.create({
          productId: product.id,
          name: template.name,
          type: template.type,
          options: template.options.map(o => ({
            value: o.value,
            priceModifier: o.priceModifier || 0,
            inventory: Math.floor((product.stock || 100) * o.stockPercent),
            sku: `${product.sku}-${o.value.replace(/\s+/g, '-').toUpperCase()}`
          })),
          isActive: true,
          isRequired: true
        }, { transaction });
      }

      // Update product with JSON variants
      await product.update({
        variants: productVariantsJson
      }, { transaction });

      count++;
      if (count % 10 === 0) console.log(`Updated ${count} products...`);
    }

    await transaction.commit();
    console.log(`Successfully seeded variants for ${count} products.`);
    process.exit(0);
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Variant seeding failed!');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.errors) {
      console.error('Sequelize Validation Errors:');
      err.errors.forEach(e => console.error(`- ${e.path}: ${e.message}`));
    }
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

console.log('Starting variant seeding process...');
seedVariants().catch(err => {
  console.error('Top-level error in seed_variants.js:', err);
  process.exit(1);
});
