/**
 * Product ID Reference Utilities
 * Auto-generated on: 2025-11-05T20:57:36.512Z
 * 
 * This file provides easy access to correct product IDs from the database
 */

export const PRODUCT_IDS = {
  // Generated from database - 16 products
  WIRELESS_BLUETOOTH_EARBUDS: 1, // Wireless Bluetooth Earbuds
  SMART_FITNESS_BAND: 2, // Smart Fitness Band
  CLASSIC_CANVAS_BACKPACK: 3, // Classic Canvas Backpack
  REUSABLE_WATER_BOTTLE_1L: 4, // Reusable Water Bottle 1L
  INTRO_TO_ALGORITHMS_CLRS: 5, // Intro to Algorithms (CLRS)
  INSTANT_NOODLES_PACK_OF_10: 6, // Instant Noodles (Pack of 10)
  IPHONE_X: 7, // iPhone X
  WOODEN_COFFEE_TABLE_WITH_STORAGE: 8, // Wooden Coffee Table with Storage
  PROFESSIONAL_DSLR_CAMERA_KIT: 12, // Professional DSLR Camera Kit
  WIRELESS_GAMING_MECHANICAL_KEYBOARD: 13, // Wireless Gaming Mechanical Keyboard
  SMART_LED_DESK_LAMP: 15, // Smart LED Desk Lamp
  TECHNO_SPARK_40: 22, // Techno Spark 40
  WIRELESS_BLUETOOTH_HEADPHONES: 23, // Wireless Bluetooth Headphones
  MODERN_OFFICE_DESK_CHAIR: 24, // Modern Office Desk Chair
  PLASTIC_SEAT: 26, // Plastic seat
  FRESH_MANGO_JUICE_500ML: 27, // Fresh Mango Juice – 500ml
};

// Helper functions
export const getProductId = (productName) => {
  const nameKey = productName.toLowerCase().trim();
  const mapping = {
    'wireless bluetooth earbuds': 1,
    'smart fitness band': 2,
    'classic canvas backpack': 3,
    'reusable water bottle 1l': 4,
    'intro to algorithms (clrs)': 5,
    'instant noodles (pack of 10)': 6,
    'iphone x': 7,
    'wooden coffee table with storage': 8,
    'professional dslr camera kit': 12,
    'wireless gaming mechanical keyboard': 13,
    'smart led desk lamp': 15,
    'techno spark 40': 22,
    'wireless bluetooth headphones': 23,
    'modern office desk chair': 24,
    'plastic seat': 26,
    'fresh mango juice – 500ml': 27
  };
  return mapping[nameKey] || null;
};

export const getProductName = (productId) => {
  const reverseMap = {
    1: 'Wireless Bluetooth Earbuds',
    2: 'Smart Fitness Band',
    3: 'Classic Canvas Backpack',
    4: 'Reusable Water Bottle 1L',
    5: 'Intro to Algorithms (CLRS)',
    6: 'Instant Noodles (Pack of 10)',
    7: 'iPhone X',
    8: 'Wooden Coffee Table with Storage',
    12: 'Professional DSLR Camera Kit',
    13: 'Wireless Gaming Mechanical Keyboard',
    15: 'Smart LED Desk Lamp',
    22: 'Techno Spark 40',
    23: 'Wireless Bluetooth Headphones',
    24: 'Modern Office Desk Chair',
    26: 'Plastic seat',
    27: 'Fresh Mango Juice – 500ml'
  };
  return reverseMap[productId] || null;
};

export const validateProductId = (productId) => {
  return PRODUCT_IDS.hasOwnProperty(Object.keys(PRODUCT_IDS).find(key => PRODUCT_IDS[key] === productId));
};