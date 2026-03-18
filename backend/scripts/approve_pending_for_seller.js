/* eslint-disable no-console */
const axios = require('axios');

const BASE = 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'wambutsidunstun@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SELLER_EMAIL = process.env.SELLER_EMAIL || 'evellahwambutsi@gmail.com';
const MAX = Number(process.env.MAX_APPROVE || 10);

async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = error.code || error.message;
      console.warn(`[retry] attempt ${i + 1}/${attempts} failed: ${code}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function main() {
  const login = await withRetry(() => axios.post(`${BASE}/auth/login`, {
    identifier: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, { timeout: 120000 }));

  const token = login.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  const pendingRes = await withRetry(() => axios.get(`${BASE}/admin/products/pending`, { headers, timeout: 180000 }));
  const pending = (Array.isArray(pendingRes.data) ? pendingRes.data : [])
    .filter((p) => String(p?.seller?.email || '').toLowerCase() === SELLER_EMAIL.toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX);

  const out = [];
  for (const p of pending) {
    const basePrice = Math.max(1, Number(p.basePrice || 4200));
    const displayPrice = Math.max(basePrice, Number(p.displayPrice || Math.round(basePrice * 1.12)));
    const discountPercentage = Number(p.discountPercentage || 10);
    const discountPrice = Math.max(1, Math.round(displayPrice * (1 - discountPercentage / 100)));

    const payload = {
      name: p.name,
      shortDescription: p.shortDescription || 'Approved listing related to Premium Running',
      fullDescription: p.fullDescription || p.description || 'Admin-approved product listing',
      basePrice,
      displayPrice,
      discountPercentage,
      discountPrice,
      stock: Number(p.stock || 20),
      deliveryMethod: p.deliveryMethod || 'Courier Delivery',
      deliveryFee: Number(p.deliveryFee || 250),
      deliveryCoverageZones: ['Nairobi CBD', 'Westlands', 'Kilimani'],
      unitOfMeasure: p.unitOfMeasure || 'pair',
      keywords: p.keywords || 'premium running,running shoes,sports footwear',
      warranty: p.warranty || '6 months limited warranty',
      returnPolicy: p.returnPolicy || 'Return within 7 days',
      marketingEnabled: true,
      marketingCommissionType: 'flat',
      marketingCommission: 200,
      marketingCommissionPercentage: 0,
      marketingStartDate: '2026-03-10',
      marketingEndDate: '2026-06-30',
      approved: true,
      reviewStatus: 'approved'
    };

    const up = await withRetry(() => axios.put(`${BASE}/products/${p.id}`, payload, { headers, timeout: 180000 }));
    const prod = up.data?.product || {};
    out.push({
      id: prod.id || p.id,
      name: prod.name || p.name,
      approved: prod.approved,
      reviewStatus: prod.reviewStatus,
      marketingEnabled: prod.marketingEnabled
    });
  }

  console.log(JSON.stringify({ sellerEmail: SELLER_EMAIL, approvedCount: out.length, items: out }, null, 2));
}

main().catch((error) => {
  if (error.response) {
    console.error('Request failed:', error.response.status, error.response.data);
  } else {
    console.error('Script failed:', error.message, error.code || '', error.stack || '');
  }
  process.exit(1);
});
