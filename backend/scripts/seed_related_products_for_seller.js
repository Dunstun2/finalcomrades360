/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const SELLER_EMAIL = process.env.SELLER_EMAIL || 'evellahwambutsi@gmail.com';
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || 'admin123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'wambutsidunstun@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SOURCE_PRODUCT_ID = Number(process.env.SOURCE_PRODUCT_ID || 224);
const SEED_COUNT = Number(process.env.SEED_COUNT || 5);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000
});

function bearer(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function formAuthHeaders(token, form) {
  return {
    ...form.getHeaders(),
    Authorization: `Bearer ${token}`
  };
}

async function login(identifier, password) {
  const res = await api.post('/auth/login', { identifier, password });
  const token = res?.data?.token;
  if (!token) throw new Error(`Login failed for ${identifier}: missing token`);
  return { token, user: res.data.user };
}

async function downloadImageBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return {
    buffer: Buffer.from(res.data),
    contentType: res.headers['content-type'] || 'image/jpeg'
  };
}

async function downloadFirstAvailable(urls) {
  let lastError;
  for (const url of urls) {
    try {
      return await downloadImageBuffer(url);
    } catch (error) {
      lastError = error;
      console.warn(`[seed] Image fetch failed: ${url}`);
    }
  }
  throw new Error(`Could not download any image. Last error: ${lastError?.message || 'unknown'}`);
}

function appendJson(form, field, value) {
  form.append(field, JSON.stringify(value));
}

async function getSourceProduct() {
  const res = await api.get(`/products/${SOURCE_PRODUCT_ID}`);
  if (!res?.data?.id) {
    throw new Error(`Source product ${SOURCE_PRODUCT_ID} not found`);
  }
  return res.data;
}

function buildApprovalPayload(created, sourceProduct) {
  const basePrice = Number(created.basePrice || sourceProduct.basePrice || 4200);
  const displayPrice = Number(created.displayPrice || Math.round(basePrice * 1.12));
  const discountPercentage = Number(created.discountPercentage || 10);
  const discountPrice = Math.max(1, Math.round(displayPrice * (1 - discountPercentage / 100)));

  return {
    name: created.name,
    shortDescription: created.shortDescription || 'Approved running shoe listing related to Premium Running.',
    fullDescription: created.fullDescription || created.description || 'Admin-approved listing related to Premium Running with complete details.',
    basePrice,
    displayPrice,
    discountPercentage,
    discountPrice,
    stock: Number(created.stock || 20),
    deliveryMethod: created.deliveryMethod || sourceProduct.deliveryMethod || 'Courier Delivery',
    deliveryFee: Number(created.deliveryFee || sourceProduct.deliveryFee || 250),
    deliveryCoverageZones: ['Nairobi CBD', 'Westlands', 'Kilimani'],
    unitOfMeasure: created.unitOfMeasure || 'pair',
    keywords: created.keywords || 'premium running,running shoes,sports footwear',
    warranty: created.warranty || '6 months limited warranty',
    returnPolicy: created.returnPolicy || 'Return within 7 days if unused and in original packaging.',
    marketingEnabled: true,
    marketingCommissionType: 'flat',
    marketingCommission: 200,
    marketingCommissionPercentage: 0,
    marketingStartDate: '2026-03-10',
    marketingEndDate: '2026-06-30',
    metaTitle: `${created.name} | Approved Listing`,
    metaDescription: 'Officially approved product listing related to Premium Running.',
    metaKeywords: 'premium running,approved,marketplace,running shoes',
    approved: true,
    reviewStatus: 'approved'
  };
}

async function createRelatedProduct(sellerToken, sourceProduct, index) {
  const now = Date.now();
  const seq = index + 1;
  const uniq = Math.random().toString(36).slice(2, 8).toUpperCase();

  const cover = await downloadFirstAvailable([
    `https://picsum.photos/seed/premium-run-related-cover-${seq}/1200/900`,
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Sneakers.jpg'
  ]);
  const gallery1 = await downloadFirstAvailable([
    `https://picsum.photos/seed/premium-run-related-gallery-${seq}/1200/900`,
    'https://upload.wikimedia.org/wikipedia/commons/d/dd/Pair_of_sports_shoes.jpg'
  ]);
  const gallery2 = await downloadFirstAvailable([
    `https://picsum.photos/seed/premium-run-related-gallery2-${seq}/1200/900`,
    'https://upload.wikimedia.org/wikipedia/commons/7/71/Black_running_shoes.jpg'
  ]);

  const categoryId = sourceProduct.categoryId || sourceProduct.category?.id;
  const subcategoryId = sourceProduct.subcategoryId || sourceProduct.subcategory?.id;

  if (!categoryId) {
    throw new Error('Source product has no categoryId; cannot seed related products safely.');
  }

  const colorSet = [
    ['Black', 'Orange'],
    ['Blue', 'White'],
    ['Green', 'Black'],
    ['Gray', 'Red'],
    ['Navy', 'Lime']
  ];

  const modelSuffix = ['Trail', 'City', 'Sprint', 'Road', 'Pulse'][index % 5];
  const selectedColors = colorSet[index % colorSet.length];

  const shortUnique = Math.random().toString(36).slice(2, 11).toUpperCase();
  const name = `PR${seq}${shortUnique}`; // Keep uniqueness in first 15 chars due backend name normalization policy.
  const basePrice = 4100 + (index * 150);

  const form = new FormData();
  form.append('name', name);
  form.append('description', `Variant ${modelSuffix.toLowerCase()} model designed to be related to Premium Running.`);
  form.append('shortDescription', `${modelSuffix} variant of Premium Running for daily performance.`);
  form.append('fullDescription', `Premium Running ${modelSuffix} is built on the same platform as Premium Running with breathable mesh upper and reliable grip.`);
  form.append('brand', sourceProduct.brand || 'Comrades Athletics');
  form.append('model', `PR-${modelSuffix}-${seq}`);
  form.append('unitOfMeasure', sourceProduct.unitOfMeasure || 'pair');
  form.append('keywords', 'premium running,running shoes,sports footwear,related product');

  form.append('basePrice', String(basePrice));
  form.append('displayPrice', String(basePrice + 600));
  form.append('discountPercentage', '10');
  form.append('discountPrice', String(Math.round((basePrice + 600) * 0.9)));
  form.append('stock', String(18 + seq));
  form.append('lowStockThreshold', '4');

  form.append('categoryId', String(categoryId));
  if (subcategoryId) form.append('subcategoryId', String(subcategoryId));

  form.append('deliveryMethod', sourceProduct.deliveryMethod || 'Courier Delivery');
  form.append('deliveryFee', String(sourceProduct.deliveryFee || 250));
  form.append('deliveryFeeType', 'fixed');

  form.append('sku', `PR-${modelSuffix.toUpperCase()}-${now}-${seq}-${uniq}`);
  form.append('barcode', `${now}${seq}${Math.floor(Math.random() * 1000)}`);
  form.append('warranty', sourceProduct.warranty || '6 months limited warranty');
  form.append('returnPolicy', sourceProduct.returnPolicy || 'Return within 7 days if unused and in original packaging.');
  form.append('condition', 'new');

  form.append('marketingEnabled', 'true');
  form.append('marketingCommissionType', 'flat');
  form.append('marketingCommission', '200');

  appendJson(form, 'keyFeatures', [
    'Breathable mesh upper',
    'Shock-absorbing cushioning',
    'Durable outsole traction',
    `${modelSuffix} tuned profile`
  ]);

  appendJson(form, 'specifications', {
    material: 'Mesh + rubber',
    soleType: 'EVA cushioning',
    gender: 'Unisex',
    countryOfOrigin: 'Kenya',
    relatedTo: `Premium Running #${SOURCE_PRODUCT_ID}`
  });

  appendJson(form, 'attributes', {
    color: selectedColors,
    sizeRange: ['40', '41', '42', '43', '44'],
    style: 'Sport'
  });

  appendJson(form, 'variants', [
    { name: `${selectedColors[0]} / 42`, sku: `PR-${seq}-A`, basePrice, stock: 8 },
    { name: `${selectedColors[1]} / 43`, sku: `PR-${seq}-B`, basePrice: basePrice + 120, stock: 7 }
  ]);

  appendJson(form, 'deliveryCoverageZones', ['Nairobi CBD', 'Westlands', 'Kilimani']);

  form.append('coverImage', cover.buffer, {
    filename: `pr-related-cover-${seq}.jpg`,
    contentType: cover.contentType
  });

  form.append('galleryImages', gallery1.buffer, {
    filename: `pr-related-gallery-${seq}-1.jpg`,
    contentType: gallery1.contentType
  });

  form.append('galleryImages', gallery2.buffer, {
    filename: `pr-related-gallery-${seq}-2.jpg`,
    contentType: gallery2.contentType
  });

  const res = await api.post('/products', form, {
    headers: formAuthHeaders(sellerToken, form),
    maxBodyLength: Infinity
  });

  return res.data?.product || res.data;
}

async function approveAndListProduct(adminToken, productId, sourceProduct) {
  const current = await api.get(`/products/${productId}`, bearer(adminToken));
  const product = current.data || {};
  const payload = buildApprovalPayload(product, sourceProduct);
  const res = await api.put(`/products/${productId}`, payload, bearer(adminToken));
  return res.data?.product || {};
}

async function main() {
  console.log(`[seed] API base: ${BASE_URL}`);
  console.log(`[seed] Seller: ${SELLER_EMAIL}`);
  console.log(`[seed] Admin: ${ADMIN_EMAIL}`);
  console.log(`[seed] Source product ID: ${SOURCE_PRODUCT_ID}`);

  const sourceProduct = await getSourceProduct();
  console.log(`[seed] Source product found: ${sourceProduct.name}`);

  const { token: sellerToken, user: sellerUser } = await login(SELLER_EMAIL, SELLER_PASSWORD);
  console.log(`[seed] Seller logged in. role=${sellerUser?.role || 'unknown'}`);

  const { token: adminToken, user: adminUser } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`[seed] Admin logged in. role=${adminUser?.role || 'unknown'}`);

  const created = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    console.log(`[seed] Creating product ${i + 1}/${SEED_COUNT} ...`);
    const p = await createRelatedProduct(sellerToken, sourceProduct, i);
    created.push(p);
  }

  const approved = [];
  for (const p of created) {
    console.log(`[seed] Approving/listing product ID ${p.id} ...`);
    const updated = await approveAndListProduct(adminToken, p.id, sourceProduct);
    approved.push(updated);
  }

  console.log('\n[seed] Completed successfully.');
  console.log(JSON.stringify({
    sellerEmail: SELLER_EMAIL,
    sourceProductId: SOURCE_PRODUCT_ID,
    createdCount: created.length,
    approvedCount: approved.length,
    items: approved.map((p) => ({
      id: p.id,
      name: p.name,
      approved: p.approved,
      reviewStatus: p.reviewStatus,
      marketingEnabled: p.marketingEnabled,
      deliveryFee: p.deliveryFee
    }))
  }, null, 2));
}

main().catch((error) => {
  if (error.response) {
    console.error('[seed] Request failed:', error.response.status, error.response.data);
  } else {
    console.error('[seed] Script failed:', error.message);
  }
  process.exit(1);
});
