'use strict';

/**
 * Seeder: Hero Promotion PlatformConfig rows
 *
 * Inserts all keys used by the Hero Promotion billing & M-Pesa settings.
 * Run with:  npx sequelize-cli db:seed --seed 20261017-seed-hero-promotion-config.js
 * Undo with: npx sequelize-cli db:seed:undo --seed 20261017-seed-hero-promotion-config.js
 *
 * Values here are the starting defaults. The admin can change them any time
 * via Admin → Hero Promotions → Edit Rates & Settings → Save Changes.
 */

const HERO_CONFIG_DEFAULTS = [
  // ── Pricing ───────────────────────────────────────────────────────────────
  { key: 'HERO_RATE_PER_DAY',         value: '500',        description: 'Base banner cost per calendar day (KES)' },
  { key: 'HERO_RATE_PER_PRODUCT',     value: '100',        description: 'Extra cost per tagged product per day (KES)' },
  { key: 'HERO_RATE_VIDEO_SURCHARGE', value: '150',        description: 'Extra cost per day for video/stream banners (KES)' },

  // ── Duration discount tiers (% off total) ─────────────────────────────────
  { key: 'HERO_DISCOUNT_7D',          value: '10',         description: 'Discount % for campaigns of 7+ days' },
  { key: 'HERO_DISCOUNT_14D',         value: '15',         description: 'Discount % for campaigns of 14+ days' },
  { key: 'HERO_DISCOUNT_30D',         value: '25',         description: 'Discount % for campaigns of 30+ days (monthly)' },

  // ── M-Pesa payment channel ────────────────────────────────────────────────
  { key: 'HERO_PAYMENT_TYPE',         value: 'till',       description: 'Active channel: till | paybill | send_money' },

  // Till (Buy Goods & Services)
  { key: 'HERO_PAYMENT_TILL',         value: '',           description: 'M-Pesa Buy Goods till number' },
  { key: 'HERO_PAYMENT_TILL_NAME',    value: '',           description: 'Store / till name shown to buyers' },

  // Paybill
  { key: 'HERO_PAYMENT_PAYBILL',      value: '',           description: 'Paybill business number' },
  { key: 'HERO_PAYMENT_PAYBILL_ACC',  value: '',           description: 'Paybill account number' },
  { key: 'HERO_PAYMENT_ACCOUNT_REF',  value: 'HERO-{id}', description: 'Account reference format ({id} = promotion ID)' },

  // Send Money
  { key: 'HERO_PAYMENT_PHONE',        value: '',           description: 'M-Pesa phone number for Send Money' },
  { key: 'HERO_PAYMENT_PHONE_NAME',   value: '',           description: 'Recipient name shown on M-Pesa' },

  // Instructions
  { key: 'HERO_PAYMENT_INSTRUCTIONS', value: '',           description: 'Custom payment note shown to buyers' },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date().toISOString();

    // Only insert keys that do NOT already exist — never overwrite admin-saved values
    const existing = await queryInterface.sequelize.query(
      `SELECT "key" FROM "PlatformConfig" WHERE "key" IN (${HERO_CONFIG_DEFAULTS.map(() => '?').join(',')})`,
      {
        replacements: HERO_CONFIG_DEFAULTS.map(r => r.key),
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const existingKeys = new Set(existing.map(r => r.key));

    const toInsert = HERO_CONFIG_DEFAULTS
      .filter(r => !existingKeys.has(r.key))
      .map(r => ({
        key:         r.key,
        value:       r.value,
        createdAt:   now,
        updatedAt:   now,
      }));

    if (toInsert.length === 0) {
      console.log('[hero-config seeder] All rows already exist — nothing inserted.');
      return;
    }

    await queryInterface.bulkInsert('PlatformConfig', toInsert);
    console.log(`[hero-config seeder] Inserted ${toInsert.length} row(s):`, toInsert.map(r => r.key));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('PlatformConfig', {
      key: HERO_CONFIG_DEFAULTS.map(r => r.key),
    });
  },
};
