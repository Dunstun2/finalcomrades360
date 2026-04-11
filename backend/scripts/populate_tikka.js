const { FastFood, sequelize } = require('../models');

async function populateTikka() {
  console.log('🍛 Starting Chicken Tikka Platter population...');

  try {
    // 0. Ensure physical columns exist in database if they were recently added to the model
    const [results] = await sequelize.query("PRAGMA table_info(FastFoods)");
    const columns = results.map(r => r.name);
    
    if (!columns.includes('nutritionalInfo')) {
      console.log('➕ Adding missing column: nutritionalInfo');
      await sequelize.query("ALTER TABLE FastFoods ADD COLUMN nutritionalInfo JSON DEFAULT '{}'");
    }
    
    if (!columns.includes('spiceLevel')) {
      console.log('➕ Adding missing column: spiceLevel');
      await sequelize.query("ALTER TABLE FastFoods ADD COLUMN spiceLevel VARCHAR(255) DEFAULT 'none'");
    }
    
    if (!columns.includes('dailyLimit')) {
      console.log('➕ Adding missing column: dailyLimit');
      await sequelize.query("ALTER TABLE FastFoods ADD COLUMN dailyLimit INTEGER DEFAULT 0");
    }

    // 1. Define the full data object
    const tikkaData = {
      name: 'Chicken Tikka Platter',
      category: 'Kenyan Cuisines', // Existing category
      categoryId: 1,
      shortDescription: 'Deliciously charred smokey chicken tikka served with soft garlic naan, fresh kachumbari, and mint chutney.',
      description: 'Our signature Chicken Tikka Platter features quarter-chicken bone-in pieces marinated in a blend of 12 traditional spices and thick hung curd, then char-grilled to perfection in a clay oven. Served with two pieces of buttery garlic naan, a crisp kachumbari salad, and our secret recipe mint-coriander chutney. Perfect for a hearty lunch or dinner.',
      basePrice: 650,
      displayPrice: 650,
      discountPercentage: 0,
      discountPrice: 650,
      isActive: true,
      isAvailable: true,
      availabilityMode: 'AUTO',
      preparationTimeMinutes: 25,
      deliveryTimeEstimateMinutes: 40,
      kitchenVendor: 'Admin Premium Kitchen',
      vendor: 1, // Admin seller
      vendorLocation: 'Student Center Plaza, Wing B',
      vendorLat: -1.2921,
      vendorLng: 36.8219,
      status: 'active',
      reviewStatus: 'approved',
      approved: true,
      hasBeenApproved: true,
      
      // NEW & DETAILED FIELDS
      estimatedServings: '1-2 people',
      spiceLevel: 'hot',
      orderCount: 28, // Triggers fire badge
      dailyLimit: 50,
      
      // Nutritional Info
      nutritionalInfo: {
        calories: '580 kcal',
        protein: '42g',
        carbs: '28g',
        fat: '18g'
      },
      
      // Customizations
      customizations: [
        'Extra Mint Chutney (Free)',
        'No Onions in Salad',
        'Well-Done Charred',
        'Replace Naan with Rice'
      ],
      
      // Ingredients
      ingredients: [
        { name: 'Bone-in Chicken', quantity: '2', unit: 'pieces' },
        { name: 'Garlic Naan', quantity: '2', unit: 'pieces' },
        { name: 'House Marinade', quantity: '1', unit: 'portion' },
        { name: 'Kachumbari Salad', quantity: '1', unit: 'bowl' }
      ],
      
      // Allergens
      allergens: ['Dairy (Marinade/Butter)', 'Gluten (Naan)'],
      
      // Tags
      tags: ['Popular', 'Spicy', 'Platter', 'Dinner'],
      dietaryTags: ['High Protein'],
      
      // Size Variants
      sizeVariants: [
        { 
          id: 'standard',
          name: 'Standard Platter', 
          basePrice: 650, 
          displayPrice: 650, 
          discountPercentage: 0,
          isAvailable: true 
        },
        { 
          id: 'jumbo',
          name: 'Jumbo Platter (Whole Chicken)', 
          basePrice: 1200, 
          displayPrice: 1200, 
          discountPercentage: 5,
          discountPrice: 1140,
          isAvailable: true 
        }
      ],
      
      // Combo Options
      comboOptions: [
        {
          id: 'combo_chips',
          name: 'Add Masala Fries',
          displayPrice: 150,
          basePrice: 150,
          items: '1 Portion Masala Fries',
          isAvailable: true
        },
        {
          id: 'combo_juice',
          name: 'Add Fresh Passion Juice',
          displayPrice: 100,
          basePrice: 100,
          items: '300ml Fresh Juice',
          isAvailable: true
        }
      ],
      
      availabilityDays: [
        { day: 'All Days', available: true, from: '08:00', to: '21:00' }
      ],
      deliveryFee: 50
    };

    // 2. Find existing or create
    const [item, created] = await FastFood.findOrCreate({
      where: { name: 'Chicken Tikka Platter' },
      defaults: tikkaData
    });

    if (!created) {
      console.log(`🔄 Item found (ID: ${item.id}). Updating with full data...`);
      await item.update(tikkaData);
      console.log('✅ Update successful!');
    } else {
      console.log(`✨ Created new item (ID: ${item.id})!`);
    }

    console.log('\n🚀 Data synchronization complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  }
}

populateTikka();
