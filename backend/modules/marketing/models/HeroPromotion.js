const { DataTypes } = require('sequelize');
const { emitRealtimeUpdate } = require('../../../utils/realtimeEmitter');

module.exports = (sequelize, DataTypes) => {
  const HeroPromotion = sequelize.define('HeroPromotion', {
    sellerId: { type: DataTypes.INTEGER, allowNull: true }, // null for system promotions
    productIds: {
      type: DataTypes.TEXT, // JSON array of product IDs
      allowNull: true,
      get() {
        const raw = this.getDataValue('productIds')
        try { return JSON.parse(raw || '[]') } catch { return [] }
      },
      set(v) { this.setDataValue('productIds', JSON.stringify(v || [])) }
    },
    fastFoodIds: {
      type: DataTypes.TEXT, // JSON array of fastfood item IDs
      allowNull: true,
      get() {
        const raw = this.getDataValue('fastFoodIds')
        try { return JSON.parse(raw || '[]') } catch { return [] }
      },
      set(v) { this.setDataValue('fastFoodIds', JSON.stringify(v || [])) }
    },
    promoType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'product' }, // 'product' or 'fastfood'
    bannerLocation: { type: DataTypes.STRING, allowNull: false, defaultValue: 'homepage' }, // 'homepage', 'products', 'fastfood', 'services', 'all'
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending_payment' }, // pending_payment, under_review, approved, scheduled, active, rejected, cancelled, expired
    paymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'unpaid' }, // unpaid, paid, refunded
    amount: { type: DataTypes.REAL, allowNull: false, defaultValue: 0 },
    durationDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
    slotsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    startAt: { type: DataTypes.DATE, allowNull: true },
    endAt: { type: DataTypes.DATE, allowNull: true },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    paymentProofUrl: { type: DataTypes.TEXT, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    customImageUrl: { type: DataTypes.TEXT, allowNull: true },
    targetUrl: { type: DataTypes.TEXT, allowNull: true },
    ctaText: { type: DataTypes.STRING, allowNull: true },
    eyebrow: { type: DataTypes.STRING, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    trustPoints: {
      type: DataTypes.TEXT, // JSON array of { icon: string, text: string }
      allowNull: true,
      get() {
        const raw = this.getDataValue('trustPoints')
        try { return JSON.parse(raw || '[]') } catch { return [] }
      },
      set(v) { this.setDataValue('trustPoints', JSON.stringify(v || [])) }
    },
    videoUrl: { type: DataTypes.TEXT, allowNull: true }, // URL to video file (MP4, WEBM, etc) or YouTube/Vimeo embed
    videoType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'background' }, // 'background' (full banner video), 'overlay' (replaces product image), 'embed' (YouTube/Vimeo)
    videoAutoplay: { type: DataTypes.BOOLEAN, defaultValue: true },
    videoLoop: { type: DataTypes.BOOLEAN, defaultValue: true },
    videoMuted: { type: DataTypes.BOOLEAN, defaultValue: true },
    // Advanced Scheduling Fields
    scheduleType: { type: DataTypes.STRING, defaultValue: 'continuous' }, // 'continuous', 'recurring', 'specific_dates'
    recurringDays: {
      type: DataTypes.TEXT, // JSON array: [0,1,2,3,4,5,6] for Sun-Sat
      allowNull: true,
      get() {
        const raw = this.getDataValue('recurringDays')
        try { return JSON.parse(raw || '[]') } catch { return [] }
      },
      set(v) { this.setDataValue('recurringDays', JSON.stringify(v || [])) }
    },
    specificDates: {
      type: DataTypes.TEXT, // JSON array of dates: ["2026-09-01", "2026-09-15"]
      allowNull: true,
      get() {
        const raw = this.getDataValue('specificDates')
        try { return JSON.parse(raw || '[]') } catch { return [] }
      },
      set(v) { this.setDataValue('specificDates', JSON.stringify(v || [])) }
    },
    timeSlotStart: { type: DataTypes.STRING, allowNull: true }, // "09:00" - show from this time
    timeSlotEnd: { type: DataTypes.STRING, allowNull: true }, // "17:00" - show until this time
    timezone: { type: DataTypes.STRING, defaultValue: 'Africa/Nairobi' }, // Timezone for time slots
    dateTimeMode: { type: DataTypes.STRING, defaultValue: 'same' }, // 'same' (one time for all dates) or 'different' (per-date times)
    dateSpecificTimes: {
      type: DataTypes.TEXT, // JSON object: { "2026-09-01": { start: "09:00", end: "17:00" }, ... }
      allowNull: true,
      get() {
        const raw = this.getDataValue('dateSpecificTimes')
        try { return JSON.parse(raw || '{}') } catch { return {} }
      },
      set(v) { this.setDataValue('dateSpecificTimes', JSON.stringify(v || {})) }
    },
  }, {
    timestamps: true,
    tableName: 'HeroPromotions',
    hooks: {
      afterSave: async () => { emitRealtimeUpdate('marketing'); },
      afterDestroy: async () => { emitRealtimeUpdate('marketing'); },
      afterBulkUpdate: async () => { emitRealtimeUpdate('marketing'); }
    }
  })

  return HeroPromotion;
};
