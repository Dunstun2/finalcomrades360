const Joi = require('joi');

// User validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required'
  }),
  phone: Joi.string().pattern(/^(\+254|0)[17]\d{8}$/).required().messages({
    'string.pattern.base': 'Please provide a valid Kenyan phone number',
    'string.empty': 'Phone number is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required'
  })
});

const loginSchema = Joi.object({
  // Accept 'identifier' (email or phone)
  identifier: Joi.string().required().messages({
    'string.empty': 'Email or phone number is required',
    'any.required': 'Email or phone number is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
}).unknown(true); // Allow other fields for backward compatibility

// Product validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 2 characters',
    'string.max': 'Product name cannot exceed 100 characters'
  }),
  shortDescription: Joi.string().min(2).max(150).required().messages({
    'string.empty': 'Short description is required',
    'string.min': 'Short description must be at least 2 characters',
    'string.max': 'Short description cannot exceed 150 characters'
  }),
  fullDescription: Joi.string().min(2).required().messages({
    'string.empty': 'Full description is required',
    'string.min': 'Full description must be at least 2 characters'
  }),
  brand: Joi.string().allow('').optional(),
  unitOfMeasure: Joi.string().required().messages({
    'string.empty': 'Unit of measure is required'
  }),
  deliveryMethod: Joi.string().required().messages({
    'string.empty': 'Delivery method is required'
  }),
  description: Joi.string().max(1000).allow('').messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  displayPrice: Joi.number().positive().optional(),
  discountPrice: Joi.number().min(0).optional(),
  keyFeatures: Joi.any().optional(),
  physicalFeatures: Joi.any().optional(),
  specifications: Joi.any().optional(),
  keywords: Joi.string().min(1).required().messages({
    'string.empty': 'Keywords are required'
  }),
  variants: Joi.any().optional(),
  newSpecName: Joi.any().optional(),
  newSpecValue: Joi.any().optional(),
  galleryImagesCount: Joi.any().optional(),
  basePrice: Joi.number().positive().required().messages({
    'number.base': 'Base price must be a number',
    'number.positive': 'Base price must be positive',
    'any.required': 'Base price is required'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock must be a number',
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative',
    'any.required': 'Stock is required'
  }),
  // Allow either categoryId or subcategoryId (at least one required)
  subcategoryId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Subcategory ID must be a number',
    'number.integer': 'Subcategory ID must be a whole number',
    'number.positive': 'Subcategory ID must be positive'
  }),
  categoryId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be a whole number',
    'number.positive': 'Category ID must be positive'
  })
}).or('categoryId', 'subcategoryId').messages({
  'object.missing': 'Provide either categoryId or subcategoryId'
}).unknown(true);

// Order validation schemas
const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().required(),
      qty: Joi.number().integer().positive().required()
    })
  ).min(1).required().messages({
    'array.min': 'Order must contain at least one item',
    'any.required': 'Order items are required'
  }),
  paymentMethod: Joi.string().valid('MPESA', 'CARD', 'CASH', 'MPESA_SIM').required().messages({
    'any.only': 'Invalid payment method',
    'any.required': 'Payment method is required'
  }),
  referralCode: Joi.string().allow('').optional(),
  deliveryLocation: Joi.string().allow('').optional()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    try { console.log('[validate] content-type:', req.headers['content-type']); } catch (_) { }
    try { console.log('[validate] body keys:', Object.keys(req.body || {})); } catch (_) { }
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) {
      return next();
    }
    // Accept either a Joi schema instance or a plain object of field validators
    const isDirectJoi = schema && typeof schema.validate === 'function';
    const effectiveSchema = isDirectJoi
      ? schema
      : (Joi.isSchema && Joi.isSchema(schema))
        ? schema
        : Joi.object(schema || {});
    const { error } = effectiveSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (error) {
      try { console.log('[validate] validation errors:', error.details?.map(d => ({ path: d.path, message: d.message }))); } catch (_) { }
      console.error(`[VALIDATION ERROR] URL: ${req.originalUrl}, Body:`, req.body, 'Error:', error.details[0].message);
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details.map(d => d.message)
      });
    }

    next();
  };
};

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    createProduct: createProductSchema,
    createOrder: createOrderSchema
  }
};