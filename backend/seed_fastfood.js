/**
 * seed_fastfood.js
 * Seeds 5 popular student fast-food items for admin: dunstunw@gmail.com
 * Run: node seed_fastfood.js
 */

const { FastFood, User, sequelize } = require('./models');

const ADMIN_EMAIL = 'dunstunw@gmail.com';

// 5 student favourites with real Unsplash images
const FASTFOOD_ITEMS = [
  {
    name: 'Classic Beef Burger',
    category: 'Burgers',
    shortDescription: 'Juicy 200 g beef patty stacked with crisp lettuce, ripe tomatoes, pickles, onions and our signature sauce in a toasted sesame bun.',
    description: `A campus staple since day one. Our Classic Beef Burger starts with a hand-formed 200 g beef patty grilled to perfection.

Layers of crisp iceberg lettuce, thick-sliced tomatoes, tangy pickles, and caramelised onions are crowned with our house-blend signature sauce and sandwiched between a lightly toasted brioche-style sesame bun.

Fast, filling and budget-friendly – the perfect fuel between lectures.`,
    mainImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=900&auto=format&fit=crop',
    ],
    basePrice: 250,
    displayPrice: 320,
    discountPercentage: 15,
    discountPrice: 272,
    availableFrom: '08:00',
    availableTo: '22:00',
    availabilityDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    preparationTimeMinutes: 10,
    deliveryTimeEstimateMinutes: 25,
    sizeVariants: [
      { label: 'Regular', basePrice: 250, displayPrice: 320, discountPercentage: 15, discountPrice: 272, price: 272 },
      { label: 'Double Patty', basePrice: 380, displayPrice: 450, discountPercentage: 10, discountPrice: 405, price: 405 },
    ],
    isComboOption: true,
    comboOptions: [
      { label: 'Burger + Fries', basePrice: 350, displayPrice: 420, discountPercentage: 10, discountPrice: 378, price: 378 },
      { label: 'Burger + Fries + Soda', basePrice: 450, displayPrice: 520, discountPercentage: 12, discountPrice: 457, price: 457 },
    ],
    ingredients: ['Beef patty','Sesame bun','Lettuce','Tomato','Pickles','Onion','Signature sauce','Cheddar cheese'],
    kitchenVendor: 'Comrades Kitchen',
    vendorLocation: 'Student Centre, Ground Floor, Comrades Campus',
    vendorLat: -1.2921,
    vendorLng: 36.8219,
    pickupAvailable: true,
    pickupLocation: 'Student Centre Counter 2',
    deliveryAreaLimits: ['Main Campus','North Hostels','South Hostels','Staff Quarters'],
    allergens: ['Gluten','Dairy','Mustard'],
    customizations: [
      { name: 'Extra Cheese', price: 30 },
      { name: 'No Onion', price: 0 },
      { name: 'Extra Sauce', price: 15 },
    ],
    tags: ['bestseller','popular','beef','student-deal'],
    dietaryTags: ['High-Protein'],
    estimatedServings: '1 person',
    isFeatured: true,
    minOrderQty: 1,
    maxOrderQty: 20,
    deliveryFeeType: 'fixed',
    deliveryFee: 50,
    deliveryCoverageZones: ['Main Campus','North Hostels','South Hostels'],
    marketingEnabled: true,
    marketingCommissionType: 'percentage',
    marketingCommissionPercentage: 8,
    marketingCommission: 8,
    marketingDuration: 30,
    marketingStartDate: new Date().toISOString().split('T')[0],
    marketingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availabilityMode: 'AUTO',
    ratings: { average: 4.7, count: 312 },
    orderCount: 893,
    status: 'active',
    reviewStatus: 'approved',
    approved: true,
    hasBeenApproved: true,
    isActive: true,
    isAvailable: true,
  },
  {
    name: 'Crispy Chicken Shawarma',
    category: 'Shawarma & Wraps',
    shortDescription: 'Tender marinated chicken strips wrapped in soft flatbread with garlic sauce, fresh veggies and chilli.',
    description: `The most-ordered item on campus. Strips of slow-marinated chicken are roasted on a vertical spit until beautifully golden and slightly crispy on the edges.

Wrapped in warm, pillowy flatbread and loaded with shredded cabbage, diced tomatoes, cucumber slices, a generous drizzle of creamy garlic sauce and a kick of bird's-eye chilli sauce.

One wrap = a complete meal. Students run on shawarma.`,
    mainImage: 'https://images.unsplash.com/photo-1561050674-8d4b5adbed33?q=80&w=900&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1561050674-8d4b5adbed33?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?q=80&w=900&auto=format&fit=crop',
    ],
    basePrice: 200,
    displayPrice: 260,
    discountPercentage: 10,
    discountPrice: 234,
    availableFrom: '09:00',
    availableTo: '21:00',
    availabilityDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    preparationTimeMinutes: 8,
    deliveryTimeEstimateMinutes: 20,
    sizeVariants: [
      { label: 'Single Wrap', basePrice: 200, displayPrice: 260, discountPercentage: 10, discountPrice: 234, price: 234 },
      { label: 'Double Wrap', basePrice: 350, displayPrice: 450, discountPercentage: 10, discountPrice: 405, price: 405 },
    ],
    isComboOption: true,
    comboOptions: [
      { label: 'Shawarma + Juice', basePrice: 280, displayPrice: 350, discountPercentage: 8, discountPrice: 322, price: 322 },
    ],
    ingredients: ['Chicken breast','Flatbread','Garlic sauce','Cabbage','Tomato','Cucumber','Chilli sauce','Mixed spices'],
    kitchenVendor: 'Comrades Kitchen',
    vendorLocation: 'Student Centre, Ground Floor, Comrades Campus',
    vendorLat: -1.2921,
    vendorLng: 36.8219,
    pickupAvailable: true,
    pickupLocation: 'Student Centre Counter 1',
    deliveryAreaLimits: ['Main Campus','North Hostels','South Hostels'],
    allergens: ['Gluten'],
    customizations: [
      { name: 'Extra Garlic Sauce', price: 15 },
      { name: 'No Chilli', price: 0 },
      { name: 'Add Fries Inside', price: 40 },
    ],
    tags: ['popular','chicken','wrap','no-beef'],
    dietaryTags: [],
    estimatedServings: '1 person',
    isFeatured: true,
    minOrderQty: 1,
    maxOrderQty: 30,
    deliveryFeeType: 'fixed',
    deliveryFee: 40,
    deliveryCoverageZones: ['Main Campus','North Hostels','South Hostels'],
    marketingEnabled: true,
    marketingCommissionType: 'percentage',
    marketingCommissionPercentage: 10,
    marketingCommission: 10,
    marketingDuration: 30,
    marketingStartDate: new Date().toISOString().split('T')[0],
    marketingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availabilityMode: 'AUTO',
    ratings: { average: 4.8, count: 541 },
    orderCount: 1402,
    status: 'active',
    reviewStatus: 'approved',
    approved: true,
    hasBeenApproved: true,
    isActive: true,
    isAvailable: true,
  },
  {
    name: 'Loaded Cheese Fries',
    category: 'Fries & Sides',
    shortDescription: 'Golden crispy fries smothered in melted cheddar cheese sauce, bacon bits and jalapeños. The ultimate study snack.',
    description: `Thick-cut potatoes fried to a golden crisp and instantly showered with our rich, molten cheddar cheese sauce. Topped with crispy streaky bacon crumbles, pickled jalapeño rings and a dusting of smoked paprika.

Perfect for sharing between hostel roommates or hoarding all to yourself during a late-night study session. Available in small and large portions.`,
    mainImage: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=900&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=900&auto=format&fit=crop',
    ],
    basePrice: 150,
    displayPrice: 200,
    discountPercentage: 10,
    discountPrice: 180,
    availableFrom: '10:00',
    availableTo: '23:00',
    availabilityDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    preparationTimeMinutes: 7,
    deliveryTimeEstimateMinutes: 18,
    sizeVariants: [
      { label: 'Small', basePrice: 150, displayPrice: 200, discountPercentage: 10, discountPrice: 180, price: 180 },
      { label: 'Large', basePrice: 250, displayPrice: 320, discountPercentage: 10, discountPrice: 288, price: 288 },
    ],
    isComboOption: false,
    comboOptions: [],
    ingredients: ['Potatoes','Cheddar cheese sauce','Bacon bits','Jalapeños','Smoked paprika','Vegetable oil','Salt'],
    kitchenVendor: 'Comrades Kitchen',
    vendorLocation: 'Student Centre, Ground Floor, Comrades Campus',
    vendorLat: -1.2921,
    vendorLng: 36.8219,
    pickupAvailable: true,
    pickupLocation: 'Student Centre Counter 3',
    deliveryAreaLimits: ['Main Campus','North Hostels','South Hostels','Library Block'],
    allergens: ['Dairy','Gluten'],
    customizations: [
      { name: 'Extra Cheese Sauce', price: 30 },
      { name: 'No Jalapeño', price: 0 },
      { name: 'Add Sour Cream', price: 20 },
    ],
    tags: ['snack','cheesy','shareable','late-night'],
    dietaryTags: [],
    estimatedServings: '1–2 people',
    isFeatured: false,
    minOrderQty: 1,
    maxOrderQty: 15,
    deliveryFeeType: 'fixed',
    deliveryFee: 30,
    deliveryCoverageZones: ['Main Campus','North Hostels','South Hostels'],
    marketingEnabled: true,
    marketingCommissionType: 'percentage',
    marketingCommissionPercentage: 7,
    marketingCommission: 7,
    marketingDuration: 30,
    marketingStartDate: new Date().toISOString().split('T')[0],
    marketingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availabilityMode: 'AUTO',
    ratings: { average: 4.5, count: 228 },
    orderCount: 560,
    status: 'active',
    reviewStatus: 'approved',
    approved: true,
    hasBeenApproved: true,
    isActive: true,
    isAvailable: true,
  },
  {
    name: 'Margherita Pizza Slice',
    category: 'Pizza',
    shortDescription: 'Classic Neapolitan-style pizza slice with San Marzano tomato sauce, fresh mozzarella and fragrant basil.',
    description: `The timeless classic that never disappoints. Our Margherita is built on a hand-stretched dough base that delivers the perfect balance of crispy edges and a chewy centre.

Topped with tangy San Marzano tomato sauce, generous slabs of fresh mozzarella, and hand-torn basil leaves from the kitchen garden, finished with a drizzle of extra-virgin olive oil.

Available by the slice or as a full 10-inch pie. Great for quick bites between classes.`,
    mainImage: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=900&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=900&auto=format&fit=crop',
    ],
    basePrice: 180,
    displayPrice: 230,
    discountPercentage: 12,
    discountPrice: 202,
    availableFrom: '10:00',
    availableTo: '21:30',
    availabilityDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    preparationTimeMinutes: 12,
    deliveryTimeEstimateMinutes: 28,
    sizeVariants: [
      { label: 'Single Slice', basePrice: 180, displayPrice: 230, discountPercentage: 12, discountPrice: 202, price: 202 },
      { label: 'Full 10"', basePrice: 900, displayPrice: 1100, discountPercentage: 12, discountPrice: 968, price: 968 },
    ],
    isComboOption: true,
    comboOptions: [
      { label: '2 Slices + Soda', basePrice: 420, displayPrice: 520, discountPercentage: 10, discountPrice: 468, price: 468 },
    ],
    ingredients: ['Pizza dough','San Marzano tomato sauce','Fresh mozzarella','Fresh basil','Olive oil','Salt','Yeast'],
    kitchenVendor: 'Comrades Kitchen',
    vendorLocation: 'Student Centre, Ground Floor, Comrades Campus',
    vendorLat: -1.2921,
    vendorLng: 36.8219,
    pickupAvailable: true,
    pickupLocation: 'Student Centre Counter 4',
    deliveryAreaLimits: ['Main Campus','North Hostels','South Hostels','Staff Quarters','Library Block'],
    allergens: ['Gluten','Dairy'],
    customizations: [
      { name: 'Extra Mozzarella', price: 40 },
      { name: 'Add Chilli Flakes', price: 0 },
      { name: 'Gluten-Free Base (+surcharge)', price: 80 },
    ],
    tags: ['vegetarian','pizza','classic','shareable'],
    dietaryTags: ['Vegetarian'],
    estimatedServings: '1 person (slice)',
    isFeatured: true,
    minOrderQty: 1,
    maxOrderQty: 20,
    deliveryFeeType: 'fixed',
    deliveryFee: 60,
    deliveryCoverageZones: ['Main Campus','North Hostels','South Hostels'],
    marketingEnabled: true,
    marketingCommissionType: 'percentage',
    marketingCommissionPercentage: 9,
    marketingCommission: 9,
    marketingDuration: 30,
    marketingStartDate: new Date().toISOString().split('T')[0],
    marketingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availabilityMode: 'AUTO',
    ratings: { average: 4.6, count: 189 },
    orderCount: 445,
    status: 'active',
    reviewStatus: 'approved',
    approved: true,
    hasBeenApproved: true,
    isActive: true,
    isAvailable: true,
  },
  {
    name: 'Spicy Ramen Noodle Bowl',
    category: 'Noodles & Asian',
    shortDescription: 'Steaming bowl of rich tonkotsu broth with springy ramen noodles, soft-boiled egg, chashu pork and bamboo shoots.',
    description: `Inspired by the ramen stalls of Tokyo's student districts. Our Spicy Ramen starts with a 12-hour tonkotsu bone broth, blended with a fiery chilli miso paste.

Topped with springy Sun Noodles ramen, melt-in-your-mouth chashu pork belly, a perfectly jammy soft-boiled marinated egg, narutomaki fish cake, crispy bamboo shoots and a swirl of aromatic chilli oil.

Rich, warming and deeply satisfying — exactly what exam season calls for.`,
    mainImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=900&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=900&auto=format&fit=crop',
    ],
    basePrice: 280,
    displayPrice: 360,
    discountPercentage: 10,
    discountPrice: 324,
    availableFrom: '11:00',
    availableTo: '21:00',
    availabilityDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    preparationTimeMinutes: 15,
    deliveryTimeEstimateMinutes: 30,
    sizeVariants: [
      { label: 'Regular Bowl', basePrice: 280, displayPrice: 360, discountPercentage: 10, discountPrice: 324, price: 324 },
      { label: 'Large Bowl', basePrice: 380, displayPrice: 470, discountPercentage: 10, discountPrice: 423, price: 423 },
    ],
    isComboOption: false,
    comboOptions: [],
    ingredients: ['Ramen noodles','Tonkotsu broth','Chilli miso paste','Chashu pork belly','Soft-boiled egg','Bamboo shoots','Narutomaki','Spring onion','Nori','Chilli oil'],
    kitchenVendor: 'Comrades Kitchen',
    vendorLocation: 'Student Centre, Ground Floor, Comrades Campus',
    vendorLat: -1.2921,
    vendorLng: 36.8219,
    pickupAvailable: true,
    pickupLocation: 'Student Centre Counter 5',
    deliveryAreaLimits: ['Main Campus','North Hostels'],
    allergens: ['Gluten','Eggs','Soy','Shellfish'],
    customizations: [
      { name: 'Extra Egg', price: 30 },
      { name: 'Extra Noodles', price: 40 },
      { name: 'No Pork (Vegetable Broth)', price: 0 },
      { name: 'Less Spicy', price: 0 },
    ],
    tags: ['spicy','asian','warming','noodles','ramen'],
    dietaryTags: ['Spicy'],
    estimatedServings: '1 person',
    isFeatured: false,
    minOrderQty: 1,
    maxOrderQty: 10,
    deliveryFeeType: 'fixed',
    deliveryFee: 70,
    deliveryCoverageZones: ['Main Campus','North Hostels'],
    marketingEnabled: true,
    marketingCommissionType: 'percentage',
    marketingCommissionPercentage: 8,
    marketingCommission: 8,
    marketingDuration: 30,
    marketingStartDate: new Date().toISOString().split('T')[0],
    marketingEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availabilityMode: 'AUTO',
    ratings: { average: 4.9, count: 97 },
    orderCount: 203,
    status: 'active',
    reviewStatus: 'approved',
    approved: true,
    hasBeenApproved: true,
    isActive: true,
    isAvailable: true,
  },
];

async function seedFastFood() {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const admin = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!admin) {
      console.error(`❌  Admin user with email "${ADMIN_EMAIL}" not found. Aborting.`);
      process.exit(1);
    }
    console.log(`✅  Found admin: ${admin.name || admin.email} (id=${admin.id})`);

    let created = 0;
    for (const item of FASTFOOD_ITEMS) {
      const existing = await FastFood.findOne({ where: { name: item.name, vendor: admin.id }, transaction });
      if (existing) {
        console.log(`  ⚠️   "${item.name}" already exists (id=${existing.id}), skipping.`);
        continue;
      }

      const ff = await FastFood.create({
        ...item,
        vendor: admin.id,
        addedBy: admin.id,
        changes: [],
      }, { transaction });

      console.log(`  ✅  Created: "${ff.name}" (id=${ff.id})`);
      created++;
    }

    await transaction.commit();
    console.log(`\n🎉  Seeding complete! ${created} fast food item(s) created.`);
    process.exit(0);
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('❌  Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedFastFood();
