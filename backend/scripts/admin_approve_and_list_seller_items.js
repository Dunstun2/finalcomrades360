/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'wambutsidunstun@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TARGET_SELLER_EMAIL = process.env.TARGET_SELLER_EMAIL || 'kachila@gmail.com';

if (!ADMIN_PASSWORD) {
  console.error('Missing ADMIN_PASSWORD environment variable.');
  console.error('Example: set ADMIN_PASSWORD=admin123');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000
});

async function login(identifier, password) {
  const res = await api.post('/auth/login', { identifier, password });
  const token = res?.data?.token;
  if (!token) {
    throw new Error('Login failed: no token returned');
  }
  return { token, user: res.data.user };
}

function bearer(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function safeNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildProductListingPayload(product) {
  const basePrice = Math.max(1, safeNum(product.basePrice, 100));
  const displayPrice = Math.max(basePrice, safeNum(product.displayPrice, basePrice + 120));
  const discountPercentage = Number.isFinite(parseInt(product.discountPercentage, 10))
    ? parseInt(product.discountPercentage, 10)
    : 10;

  const discountPriceRaw = displayPrice * (1 - Math.min(Math.max(discountPercentage, 0), 90) / 100);
  const discountPrice = Math.max(1, Math.round(discountPriceRaw));

  return {
    name: product.name,
    shortDescription: product.shortDescription || 'Approved listing with complete details',
    fullDescription: product.fullDescription || 'This product has been reviewed, listed, and approved by admin with complete listing details.',
    basePrice,
    displayPrice,
    discountPercentage,
    discountPrice,
    deliveryMethod: product.deliveryMethod || 'Courier Delivery',
    deliveryFee: safeNum(product.deliveryFee, 150),
    deliveryCoverageZones: ['Nairobi CBD', 'Westlands', 'Kilimani'],
    unitOfMeasure: product.unitOfMeasure || 'pcs',
    keywords: product.keywords || 'approved,listed,marketplace',
    warranty: product.warranty || '6 months warranty',
    returnPolicy: product.returnPolicy || 'Return within 7 days if unused',
    stock: Number.isFinite(parseInt(product.stock, 10)) ? parseInt(product.stock, 10) : 10,
    marketingEnabled: true,
    marketingCommissionType: 'flat',
    marketingCommission: 200,
    marketingCommissionPercentage: 0,
    marketingStartDate: '2026-03-10',
    marketingEndDate: '2026-04-30',
    metaTitle: `${product.name} | Approved Listing`,
    metaDescription: 'Officially approved product listing with marketing enabled.',
    metaKeywords: 'approved,marketplace,product'
  };
}

function buildFastFoodListingPayload(item) {
  const basePrice = Math.max(1, safeNum(item.basePrice, 300));
  const displayPrice = Math.max(basePrice, safeNum(item.displayPrice, basePrice + 100));
  const discountPercentage = Number.isFinite(parseInt(item.discountPercentage, 10))
    ? parseInt(item.discountPercentage, 10)
    : 10;

  const discountPriceRaw = displayPrice * (1 - Math.min(Math.max(discountPercentage, 0), 90) / 100);
  const discountPrice = Math.max(1, Math.round(discountPriceRaw));

  // Process sizeVariants: set displayPrice and calculate discountPrice for each variant
  let sizeVariants = [];
  try {
    const rawVariants = typeof item.sizeVariants === 'string' 
      ? JSON.parse(item.sizeVariants) 
      : item.sizeVariants;
    if (Array.isArray(rawVariants)) {
      sizeVariants = rawVariants.map(v => {
        const vBasePrice = Math.max(1, safeNum(v.basePrice || v.price, basePrice));
        const vDisplayPrice = Math.max(vBasePrice, safeNum(v.displayPrice, vBasePrice + 100));
        const vDiscountPercentage = Number.isFinite(parseInt(v.discountPercentage, 10)) 
          ? parseInt(v.discountPercentage, 10) 
          : 10;
        const vDiscountPriceRaw = vDisplayPrice * (1 - Math.min(Math.max(vDiscountPercentage, 0), 90) / 100);
        const vDiscountPrice = Math.max(1, Math.round(vDiscountPriceRaw));

        return {
          ...v,
          basePrice: vBasePrice,
          displayPrice: vDisplayPrice,
          discountPercentage: vDiscountPercentage,
          discountPrice: vDiscountPrice,
          price: vDiscountPrice // Final price for compatibility
        };
      });
    }
  } catch (err) {
    console.error('Failed to parse sizeVariants:', err.message);
  }

  // Process comboOptions: set displayPrice and calculate discountPrice for each combo
  let comboOptions = [];
  try {
    const rawCombos = typeof item.comboOptions === 'string' 
      ? JSON.parse(item.comboOptions) 
      : item.comboOptions;
    if (Array.isArray(rawCombos)) {
      comboOptions = rawCombos.map(c => {
        const cBasePrice = Math.max(1, safeNum(c.basePrice || c.price, basePrice));
        const cDisplayPrice = Math.max(cBasePrice, safeNum(c.displayPrice, cBasePrice + 150));
        const cDiscountPercentage = Number.isFinite(parseInt(c.discountPercentage, 10)) 
          ? parseInt(c.discountPercentage, 10) 
          : 10;
        const cDiscountPriceRaw = cDisplayPrice * (1 - Math.min(Math.max(cDiscountPercentage, 0), 90) / 100);
        const cDiscountPrice = Math.max(1, Math.round(cDiscountPriceRaw));

        return {
          ...c,
          basePrice: cBasePrice,
          displayPrice: cDisplayPrice,
          discountPercentage: cDiscountPercentage,
          discountPrice: cDiscountPrice,
          price: cDiscountPrice // Final price for compatibility
        };
      });
    }
  } catch (err) {
    console.error('Failed to parse comboOptions:', err.message);
  }

  return {
    name: item.name,
    shortDescription: item.shortDescription || 'Approved fast food listing with full details',
    description: item.description || 'Admin-reviewed fast food listing. Delivery and marketing are enabled for visibility.',
    basePrice,
    displayPrice,
    discountPercentage,
    discountPrice,
    sizeVariants: sizeVariants.length > 0 ? sizeVariants : item.sizeVariants,
    comboOptions: comboOptions.length > 0 ? comboOptions : item.comboOptions,
    deliveryFeeType: item.deliveryFeeType || 'fixed',
    deliveryFee: safeNum(item.deliveryFee, 120),
    deliveryCoverageZones: ['Kilimani', 'Kileleshwa', 'Westlands'],
    deliveryAreaLimits: ['Kilimani', 'Kileleshwa', 'Westlands'],
    availabilityDays: item.availabilityDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    preparationTimeMinutes: Number.isFinite(parseInt(item.preparationTimeMinutes, 10)) ? parseInt(item.preparationTimeMinutes, 10) : 20,
    deliveryTimeEstimateMinutes: Number.isFinite(parseInt(item.deliveryTimeEstimateMinutes, 10)) ? parseInt(item.deliveryTimeEstimateMinutes, 10) : 35,
    availableFrom: item.availableFrom || '09:00',
    availableTo: item.availableTo || '22:00',
    isAvailable: true,
    isActive: true,
    pickupAvailable: item.pickupAvailable !== undefined ? !!item.pickupAvailable : true,
    pickupLocation: item.pickupLocation || 'Kilimani Kitchen Station A',
    marketingEnabled: true,
    marketingCommissionType: 'flat',
    marketingCommission: 50,
    marketingCommissionPercentage: 0,
    marketingDuration: 30,
    marketingStartDate: '2026-03-10',
    marketingEndDate: '2026-04-10',
    approved: true,
    reviewStatus: 'approved'
  };
}

async function getSellerIdFromPendingProducts(adminToken) {
  const res = await api.get('/admin/products/pending', bearer(adminToken));
  const products = Array.isArray(res.data) ? res.data : [];

  const mine = products
    .filter((p) => String(p?.seller?.email || '').toLowerCase() === TARGET_SELLER_EMAIL.toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const latest = mine[0] || null;
  if (!latest) {
    return { sellerId: null, latestPendingProduct: null };
  }

  const sellerId = latest.sellerId || latest.seller?.id || null;
  return { sellerId, latestPendingProduct: latest };
}

async function getSellerIdFromUsers(adminToken) {
  const res = await api.get('/admin/users', bearer(adminToken));
  const users = Array.isArray(res.data?.users) ? res.data.users : (Array.isArray(res.data) ? res.data : []);
  const seller = users.find((u) => String(u.email || '').toLowerCase() === TARGET_SELLER_EMAIL.toLowerCase());
  return seller ? seller.id : null;
}

async function findLatestPendingFastFood(adminToken, sellerId) {
  const res = await api.get(`/fastfood/vendor/${sellerId}?reviewStatus=pending&pageSize=100`, bearer(adminToken));
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  if (!rows.length) return null;
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows[0];
}

async function approveAndListProduct(adminToken, pendingProduct) {
  const productId = pendingProduct.id;
  const payload = buildProductListingPayload(pendingProduct);

  const updateRes = await api.put(`/products/${productId}`, payload, bearer(adminToken));
  const updated = updateRes?.data?.product || {};

  return {
    id: updated.id || productId,
    name: updated.name || pendingProduct.name,
    approved: updated.approved,
    reviewStatus: updated.reviewStatus,
    marketingEnabled: updated.marketingEnabled,
    deliveryFee: updated.deliveryFee
  };
}

async function approveAndListFastFood(adminToken, pendingFastFood) {
  const fastFoodId = pendingFastFood.id;
  const payload = buildFastFoodListingPayload(pendingFastFood);

  const updateRes = await api.put(`/fastfood/${fastFoodId}`, payload, bearer(adminToken));
  const updated = updateRes?.data?.data || {};

  return {
    id: updated.id || fastFoodId,
    name: updated.name || pendingFastFood.name,
    approved: updated.approved,
    reviewStatus: updated.reviewStatus,
    marketingEnabled: updated.marketingEnabled,
    deliveryFee: updated.deliveryFee
  };
}

async function main() {
  console.log(`Using API base: ${BASE_URL}`);
  console.log(`Admin login: ${ADMIN_EMAIL}`);
  console.log(`Target seller: ${TARGET_SELLER_EMAIL}`);

  const { token: adminToken, user: adminUser } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`Admin authenticated as role: ${adminUser?.role || 'unknown'}`);

  let { sellerId, latestPendingProduct } = await getSellerIdFromPendingProducts(adminToken);

  if (!sellerId) {
    sellerId = await getSellerIdFromUsers(adminToken);
  }

  if (!sellerId) {
    throw new Error(`Could not find seller account for ${TARGET_SELLER_EMAIL}`);
  }

  if (!latestPendingProduct) {
    const pendingRes = await api.get('/admin/products/pending', bearer(adminToken));
    const allPending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
    latestPendingProduct = allPending
      .filter((p) => String(p?.sellerId || p?.seller?.id) === String(sellerId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  if (!latestPendingProduct) {
    throw new Error(`No pending product found for seller ${TARGET_SELLER_EMAIL}`);
  }

  const latestPendingFastFood = await findLatestPendingFastFood(adminToken, sellerId);
  if (!latestPendingFastFood) {
    throw new Error(`No pending fast food item found for seller ${TARGET_SELLER_EMAIL}`);
  }

  console.log(`Approving/listing product ID ${latestPendingProduct.id} ...`);
  const productResult = await approveAndListProduct(adminToken, latestPendingProduct);

  console.log(`Approving/listing fast food ID ${latestPendingFastFood.id} ...`);
  const fastFoodResult = await approveAndListFastFood(adminToken, latestPendingFastFood);

  console.log('\nApproval + listing completed:');
  console.log(JSON.stringify({
    sellerEmail: TARGET_SELLER_EMAIL,
    product: productResult,
    fastFood: fastFoodResult
  }, null, 2));
}

main().catch((error) => {
  if (error.response) {
    console.error('Request failed:', error.response.status, error.response.data);
  } else {
    console.error('Script failed:', error.message);
  }
  process.exit(1);
});
