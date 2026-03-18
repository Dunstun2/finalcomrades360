const { FastFood } = require('./models');

async function updateFastFoodWithVariantsAndCombos() {
  try {
    // Find a fastfood item to update
    const item = await FastFood.findOne({ where: { id: 4 } }); // Bhajia
    
    if (!item) {
      console.log('No fastfood item found');
      process.exit(1);
    }

    console.log('Found:', item.name);
    console.log('Current basePrice:', item.basePrice);

    // Add size variants with prices
    const sizeVariants = [
      {
        name: 'Small',
        basePrice: 80,
        displayPrice: 100,
        discountPercentage: 10,
        discountPrice: 90,
        price: 90,
        isAvailable: true
      },
      {
        name: 'Medium',
        basePrice: 150,
        displayPrice: 180,
        discountPercentage: 10,
        discountPrice: 162,
        price: 162,
        isAvailable: true
      },
      {
        name: 'Large',
        basePrice: 200,
        displayPrice: 250,
        discountPercentage: 10,
        discountPrice: 225,
        price: 225,
        isAvailable: true
      }
    ];

    // Add combo options with items and prices
    const comboOptions = [
      {
        name: 'Bhajia + Chai Combo',
        basePrice: 120,
        displayPrice: 150,
        discountPercentage: 15,
        discountPrice: 128,
        price: 128,
        items: ['Bhajia (Small)', 'Chai (1 cup)', 'Sauce'],
        isAvailable: true
      },
      {
        name: 'Bhajia Family Pack',
        basePrice: 350,
        displayPrice: 400,
        discountPercentage: 10,
        discountPrice: 360,
        price: 360,
        items: ['Bhajia (Large)', 'Samosa (4 pcs)', 'Sauce (2 types)', 'Drinks (2)'],
        isAvailable: true
      },
      {
        name: 'Bhajia + Mandazi Combo',
        basePrice: 180,
        displayPrice: 220,
        discountPercentage: 10,
        discountPrice: 198,
        price: 198,
        items: ['Bhajia (Medium)', 'Mandazi (3 pcs)', 'Tea or Coffee'],
        isAvailable: true
      }
    ];

    // Update the item
    await item.update({
      sizeVariants: sizeVariants,
      comboOptions: comboOptions,
      approved: true,
      reviewStatus: 'approved'
    });

    console.log('\n✅ Updated successfully!');
    console.log('\nSize Variants:', JSON.stringify(sizeVariants, null, 2));
    console.log('\nCombo Options:', JSON.stringify(comboOptions, null, 2));

    // Verify the update
    const updated = await FastFood.findByPk(item.id);
    console.log('\n📊 Verification:');
    console.log('sizeVariants:', updated.sizeVariants);
    console.log('comboOptions:', updated.comboOptions);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateFastFoodWithVariantsAndCombos();
