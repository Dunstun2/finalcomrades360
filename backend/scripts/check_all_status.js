const { Product } = require('../models');
const { Op } = require('sequelize');

(async () => {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'name', 'approved', 'reviewStatus', 'status', 'visibilityStatus', 'isActive', 'suspended'],
      raw: true
    });
    console.log('--- ALL PRODUCT STATUS ---');
    console.table(products);
  } catch (e) {
    console.error('Error fetching products:', e);
  }
  process.exit(0);
})();
