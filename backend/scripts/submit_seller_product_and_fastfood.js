/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const SELLER_EMAIL = process.env.SELLER_EMAIL || 'kachila@gmail.com';
const SELLER_PASSWORD = process.env.SELLER_PASSWORD;

if (!SELLER_PASSWORD) {
  console.error('Missing SELLER_PASSWORD environment variable.');
  console.error('Example: set SELLER_PASSWORD=your_password_here');
  process.exit(1);
}

const client = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000
});

async function loginAndGetToken() {
  const res = await client.post('/auth/login', {
    identifier: SELLER_EMAIL,
    password: SELLER_PASSWORD
  });

  const token = res?.data?.token;
  if (!token) {
    throw new Error('Login succeeded but no token returned.');
  }
  return token;
}

async function getCategories() {
  const res = await client.get('/categories');
  if (!Array.isArray(res.data) || res.data.length === 0) {
    throw new Error('No categories found. Create categories/subcategories first.');
  }
  return res.data;
}

function pickCategoryContext(categories) {
  const withSub = categories.find((c) => Array.isArray(c.subcategories) && c.subcategories.length > 0);
  if (withSub) {
    return {
      categoryId: withSub.id,
      subcategoryId: withSub.subcategories[0].id,
      categoryName: withSub.name
    };
  }

  return {
    categoryId: categories[0].id,
    subcategoryId: null,
    categoryName: categories[0].name
  };
}

async function downloadImageBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const contentType = res.headers['content-type'] || 'image/jpeg';
  return {
    buffer: Buffer.from(res.data),
    contentType
  };
}

async function downloadFirstAvailable(urls, label) {
  let lastError = null;
  for (const url of urls) {
    try {
      return await downloadImageBuffer(url);
    } catch (error) {
      lastError = error;
      console.warn(`Image fetch failed for ${label}: ${url}`);
    }
  }

  throw new Error(`Could not download image for ${label}. Last error: ${lastError?.message || 'unknown'}`);
}

function appendJson(form, field, value) {
  form.append(field, JSON.stringify(value));
}

function authHeaders(token, form) {
  return {
    ...form.getHeaders(),
    Authorization: `Bearer ${token}`
  };
}

async function submitProduct(token, categoryContext) {
  // Use real photo URLs with seeded fallback images.
  const productCoverUrls = [
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Sneakers.jpg',
    'https://picsum.photos/seed/shoe-cover/1200/900'
  ];
  const productGalleryUrls = [
    [
      'https://upload.wikimedia.org/wikipedia/commons/7/71/Black_running_shoes.jpg',
      'https://picsum.photos/seed/shoe-gallery-1/1200/900'
    ],
    [
      'https://upload.wikimedia.org/wikipedia/commons/8/8a/Shoes_at_shelf.jpg',
      'https://picsum.photos/seed/shoe-gallery-2/1200/900'
    ],
    [
      'https://upload.wikimedia.org/wikipedia/commons/d/dd/Pair_of_sports_shoes.jpg',
      'https://picsum.photos/seed/shoe-gallery-3/1200/900'
    ]
  ];

  const cover = await downloadFirstAvailable(productCoverUrls, 'product cover');
  const gallery = await Promise.all(
    productGalleryUrls.map((urls, idx) => downloadFirstAvailable(urls, `product gallery ${idx + 1}`))
  );

  const form = new FormData();

  const now = Date.now();
  const uniqueName = `Premium Running Shoes ${now}`;

  form.append('name', uniqueName);
  form.append('description', 'High-performance running shoes with breathable mesh and cushioned sole.');
  form.append('shortDescription', 'Breathable running shoes for daily training and road runs.');
  form.append('fullDescription', 'Premium road-running shoes built for comfort, durability, and grip. Suitable for fitness runners and long-distance sessions.');
  form.append('brand', 'Comrades Athletics');
  form.append('model', 'CA-Run-Pro');
  form.append('unitOfMeasure', 'pair');
  form.append('keywords', 'running shoes,sneakers,sports footwear,fitness');

  form.append('basePrice', '4200');
  form.append('displayPrice', '5000');
  form.append('discountPercentage', '10');
  form.append('discountPrice', '4500');
  form.append('compareAtPrice', '5500');
  form.append('cost', '3200');
  form.append('stock', '35');
  form.append('lowStockThreshold', '5');

  form.append('categoryId', String(categoryContext.categoryId));
  if (categoryContext.subcategoryId) {
    form.append('subcategoryId', String(categoryContext.subcategoryId));
  }

  form.append('deliveryMethod', 'Courier Delivery');
  form.append('deliveryFee', '250');
  form.append('deliveryFeeType', 'fixed');

  form.append('sku', `CR-${now}`);
  form.append('barcode', `${now}`);
  form.append('warranty', '6 months limited warranty');
  form.append('returnPolicy', 'Return within 7 days if unused and in original packaging.');
  form.append('condition', 'new');

  form.append('metaTitle', 'Premium Running Shoes - Comrades Athletics');
  form.append('metaDescription', 'Shop premium running shoes with breathable upper and cushioned support.');
  form.append('metaKeywords', 'running shoes,athletic shoes,sneakers,kenya');

  form.append('marketingEnabled', 'true');
  form.append('marketingCommissionType', 'flat');
  form.append('marketingCommission', '200');
  form.append('marketingCommissionPercentage', '0');
  form.append('marketingStartDate', '2026-03-10');
  form.append('marketingEndDate', '2026-04-30');

  appendJson(form, 'keyFeatures', [
    'Breathable mesh upper',
    'Shock-absorbing midsole',
    'Anti-slip outsole',
    'Lightweight build'
  ]);

  appendJson(form, 'specifications', {
    material: 'Mesh + rubber',
    soleType: 'EVA cushioning',
    gender: 'Unisex',
    countryOfOrigin: 'Kenya'
  });

  appendJson(form, 'attributes', {
    color: ['Black', 'Blue'],
    sizeRange: ['40', '41', '42', '43', '44'],
    style: 'Sport'
  });

  appendJson(form, 'variants', [
    { name: 'Black / 42', sku: `CR-BLK-42-${now}`, basePrice: 4200, stock: 12 },
    { name: 'Black / 43', sku: `CR-BLK-43-${now}`, basePrice: 4200, stock: 10 },
    { name: 'Blue / 42', sku: `CR-BLU-42-${now}`, basePrice: 4300, stock: 7 },
    { name: 'Blue / 44', sku: `CR-BLU-44-${now}`, basePrice: 4300, stock: 6 }
  ]);

  appendJson(form, 'logistics', {
    weight: '0.9kg',
    dimensions: { length: 32, width: 22, height: 13, unit: 'cm' },
    deliveryMethod: 'Courier Delivery',
    deliveryZones: ['Nairobi CBD', 'Westlands', 'Kilimani'],
    returnPolicy: '7-day return policy',
    warranty: '6 months'
  });

  appendJson(form, 'deliveryCoverageZones', ['Nairobi CBD', 'Westlands', 'Kilimani']);

  form.append('coverImage', cover.buffer, {
    filename: `product-cover-${now}.jpg`,
    contentType: cover.contentType
  });

  gallery.forEach((img, index) => {
    form.append('galleryImages', img.buffer, {
      filename: `product-gallery-${now}-${index + 1}.jpg`,
      contentType: img.contentType
    });
  });

  const res = await client.post('/products', form, {
    headers: authHeaders(token, form),
    maxBodyLength: Infinity
  });

  return res.data;
}

async function submitFastFood(token, categoryContext) {
  const foodMainUrls = [
    'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cheeseburger.jpg',
    'https://picsum.photos/seed/food-main/1200/900'
  ];
  const foodGalleryUrls = [
    [
      'https://upload.wikimedia.org/wikipedia/commons/0/0b/RedDot_Burger.jpg',
      'https://picsum.photos/seed/food-gallery-1/1200/900'
    ],
    [
      'https://upload.wikimedia.org/wikipedia/commons/6/6f/Hamburger_%28black_bg%29.jpg',
      'https://picsum.photos/seed/food-gallery-2/1200/900'
    ],
    [
      'https://upload.wikimedia.org/wikipedia/commons/4/4f/Foodiesfeed.com_double-burger-with-fries.jpg',
      'https://picsum.photos/seed/food-gallery-3/1200/900'
    ]
  ];

  const main = await downloadFirstAvailable(foodMainUrls, 'fastfood main');
  const gallery = await Promise.all(
    foodGalleryUrls.map((urls, idx) => downloadFirstAvailable(urls, `fastfood gallery ${idx + 1}`))
  );

  const form = new FormData();
  const now = Date.now();
  const uniqueName = `Classic Beef Burger Combo ${now}`;

  form.append('name', uniqueName);
  form.append('category', String(categoryContext.categoryName || 'Fast Food'));
  form.append('categoryId', String(categoryContext.categoryId));
  if (categoryContext.subcategoryId) {
    form.append('subcategoryId', String(categoryContext.subcategoryId));
  }

  form.append('shortDescription', 'Juicy grilled beef burger served hot with fries option.');
  form.append('description', 'A freshly grilled beef burger with lettuce, tomato, cheese, and house sauce. Suitable for lunch and dinner.');

  form.append('basePrice', '750');
  form.append('displayPrice', '900');
  form.append('discountPercentage', '5');
  form.append('discountPrice', '855');

  form.append('preparationTimeMinutes', '20');
  form.append('deliveryTimeEstimateMinutes', '35');
  form.append('availableFrom', '09:00');
  form.append('availableTo', '22:00');

  form.append('pickupAvailable', 'true');
  form.append('pickupLocation', 'Kilimani Kitchen Station A');
  form.append('isAvailable', 'true');
  form.append('isActive', 'true');
  form.append('isFeatured', 'false');

  form.append('vendorLocation', 'Kilimani, Nairobi');
  form.append('vendorLat', '-1.2921');
  form.append('vendorLng', '36.8219');

  form.append('deliveryFeeType', 'fixed');
  form.append('deliveryFee', '120');

  form.append('marketingEnabled', 'true');
  form.append('marketingCommissionType', 'flat');
  form.append('marketingCommission', '50');
  form.append('marketingCommissionPercentage', '0');
  form.append('marketingDuration', '30');
  form.append('marketingStartDate', '2026-03-10');
  form.append('marketingEndDate', '2026-04-10');

  form.append('minOrderQty', '1');
  form.append('maxOrderQty', '10');
  form.append('estimatedServings', '1 person');

  appendJson(form, 'availabilityDays', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  appendJson(form, 'ingredients', ['Beef patty', 'Brioche bun', 'Cheddar', 'Lettuce', 'Tomato', 'Onion', 'House sauce']);
  appendJson(form, 'allergens', ['Gluten', 'Dairy']);
  appendJson(form, 'dietaryTags', ['high-protein']);
  appendJson(form, 'tags', ['burger', 'beef', 'fastfood', 'combo']);

  appendJson(form, 'sizeVariants', [
    { name: 'Regular', basePrice: 750, stock: 50 },
    { name: 'Large', basePrice: 980, stock: 40 }
  ]);

  appendJson(form, 'comboOptions', [
    { name: 'Burger + Fries', basePrice: 1050 },
    { name: 'Burger + Fries + Soda', basePrice: 1250 }
  ]);

  appendJson(form, 'customizations', [
    { name: 'Extra Cheese', price: 80 },
    { name: 'No Onions', price: 0 },
    { name: 'Spicy Sauce', price: 30 }
  ]);

  appendJson(form, 'deliveryAreaLimits', ['Kilimani', 'Kileleshwa', 'Westlands']);
  appendJson(form, 'deliveryCoverageZones', ['Kilimani', 'Kileleshwa', 'Westlands']);
  appendJson(form, 'nutritionalInfo', {
    calories: 780,
    protein: '35g',
    carbs: '58g',
    fat: '42g'
  });

  form.append('mainImage', main.buffer, {
    filename: `fastfood-main-${now}.jpg`,
    contentType: main.contentType
  });

  gallery.forEach((img, index) => {
    form.append('galleryImages', img.buffer, {
      filename: `fastfood-gallery-${now}-${index + 1}.jpg`,
      contentType: img.contentType
    });
  });

  const res = await client.post('/fastfood', form, {
    headers: authHeaders(token, form),
    maxBodyLength: Infinity
  });

  return res.data;
}

async function main() {
  console.log(`Using API base: ${BASE_URL}`);
  console.log(`Logging in as: ${SELLER_EMAIL}`);

  const token = await loginAndGetToken();
  const categories = await getCategories();
  const categoryContext = pickCategoryContext(categories);

  console.log('Submitting seller product with full payload and variants...');
  const productResult = await submitProduct(token, categoryContext);

  console.log('Submitting fast food item with full payload and variants...');
  const fastFoodResult = await submitFastFood(token, categoryContext);

  const product = productResult?.product || {};
  const fastFood = fastFoodResult?.data || {};

  console.log('\nSubmission complete:');
  console.log(JSON.stringify({
    product: {
      id: product.id,
      name: product.name,
      approved: product.approved,
      reviewStatus: product.reviewStatus,
      message: productResult?.message
    },
    fastFood: {
      id: fastFood.id,
      name: fastFood.name,
      approved: fastFood.approved,
      reviewStatus: fastFood.reviewStatus
    }
  }, null, 2));

  if (product.reviewStatus !== 'pending' || fastFood.reviewStatus !== 'pending') {
    console.warn('Warning: One or both items are not pending. Check roles and workflow.');
  }
}

main().catch((error) => {
  if (error.response) {
    console.error('Request failed:', error.response.status, error.response.data);
  } else {
    console.error('Script failed:', error.message);
  }
  process.exit(1);
});
