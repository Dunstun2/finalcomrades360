const Joi = require('joi');

// Reusable: one slot in a meal plan template — supports multi-dish via fastFoodItemIds[]
const templateSlotSchema = Joi.object({
  dayOfWeek: Joi.string().required(),
  mealTimeType: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
  preferredTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  // fastFoodItemIds is required — array of food ids (repeated for qty > 1)
  fastFoodItemIds: Joi.array().items(Joi.number().integer()).min(1).required(),
  // Legacy single id — optional, kept for backwards compat with old stored data
  fastFoodItemId: Joi.number().integer().optional(),
});

const planSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  type: Joi.string().valid('seller', 'meal', 'service', 'laundry', 'delivery', 'premium_customer').required(),
  status: Joi.string().valid('Draft', 'Published', 'Archived', 'Disabled').default('Draft'),
  price: Joi.number().min(0).required(),
  currency: Joi.string().default('KES'),
  gracePeriodDays: Joi.number().integer().min(0).default(3),
  trialPeriodDays: Joi.number().integer().min(0).default(0),
  isVisible: Joi.boolean().default(true),
  imageUrl: Joi.string().uri().allow(null, '').optional(),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  benefits: Joi.array().items(
    Joi.object({
      featureCode: Joi.string().required(),
      featureName: Joi.string().allow('').optional(),
      description: Joi.string().allow('').optional(),
      category: Joi.string().allow('').optional(),
      limitType: Joi.string().valid('boolean', 'counter', 'rate').required(),
      value: Joi.object().required(),
      startDate: Joi.date().allow(null, '').optional(),
      endDate: Joi.date().allow(null, '').optional()
    })
  ).optional().default([]),
  // Meal plan template schedule — each slot can hold 1 or more dishes
  templateSchedule: Joi.array().items(templateSlotSchema).optional().allow(null)
});

const updatePlanSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  status: Joi.string().valid('Draft', 'Published', 'Archived', 'Disabled').optional(),
  price: Joi.number().min(0).optional(),
  currency: Joi.string().optional(),
  gracePeriodDays: Joi.number().integer().min(0).optional(),
  trialPeriodDays: Joi.number().integer().min(0).optional(),
  isVisible: Joi.boolean().optional(),
  imageUrl: Joi.string().uri().allow(null, '').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  benefits: Joi.array().items(
    Joi.object({
      featureCode: Joi.string().required(),
      featureName: Joi.string().allow('').optional(),
      description: Joi.string().allow('').optional(),
      category: Joi.string().allow('').optional(),
      limitType: Joi.string().valid('boolean', 'counter', 'rate').required(),
      value: Joi.object().required(),
      startDate: Joi.date().allow(null, '').optional(),
      endDate: Joi.date().allow(null, '').optional()
    })
  ).optional(),
  templateSchedule: Joi.array().items(templateSlotSchema).optional().allow(null)
});

const subscribeSchema = Joi.object({
  // Optional — for seller/service plans only
  planId: Joi.number().integer().optional(),

  // Guest stateless checkout (no account needed, same as guest orders)
  guestName: Joi.string().trim().min(2).optional(),
  guestEmail: Joi.string().email().optional(),
  guestPhone: Joi.string().pattern(/^(\+?254|0)[17]\d{8}$/).optional().messages({
    'string.pattern.base': 'Phone must be a valid Kenyan number (e.g. 0712345678 or +254712345678)'
  }),
  guestDeliveryAddress: Joi.string().optional(),
  paymentPhone: Joi.string().optional(), // For M-Pesa STK push on checkout

  // Custom Meal Plan fields (self-built by customer)
  customSchedule: Joi.array().items(
    Joi.object({
      dayOfWeek: Joi.string().required(),
      mealTimeType: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
      preferredTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      fastFoodItemIds: Joi.array().items(Joi.number().integer()).min(1).optional(),
      fastFoodItemId: Joi.number().integer().optional(), // legacy single-item support
      deliveryAddress: Joi.string().allow(null, '').optional(),
      pickupStationId: Joi.number().integer().allow(null).optional()
    })
  ).optional()
});


const scheduleSchema = Joi.object({
  schedule: Joi.array().items(
    Joi.object({
      dayOfWeek: Joi.string().required(),
      mealTimeType: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
      preferredTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // Matches "12:30", "08:15", "9:00", etc.
      pickupStationId: Joi.number().integer().allow(null).optional(),
      deliveryAddress: Joi.string().allow(null, '').optional(),
      // Accept 1-or-more preferred items; single id kept for backwards compat
      preferredFastFoodItemIds: Joi.array().items(Joi.number().integer()).min(1).optional(),
      preferredFastFoodItemId: Joi.number().integer().allow(null).optional()
    })
  ).min(1).required()
});

const updateAddressSchema = Joi.object({
  deliveryAddress: Joi.string().required(),
  pickupStationId: Joi.number().integer().allow(null).optional()
});

// Customer-facing: Create personal meal plan (can only select from existing packages)
const userPlanSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  benefitPackageId: Joi.number().integer().allow(null).optional(), // Can only select existing package
  templateSchedule: Joi.array().items(templateSlotSchema).min(1).required()
});

// Customer-facing: Update personal meal plan
const updateUserPlanSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  benefitPackageId: Joi.number().integer().allow(null).optional(),
  templateSchedule: Joi.array().items(templateSlotSchema).min(1).optional()
});

module.exports = {
  planSchema,
  updatePlanSchema,
  subscribeSchema,
  scheduleSchema,
  updateAddressSchema,
  userPlanSchema,
  updateUserPlanSchema
};
