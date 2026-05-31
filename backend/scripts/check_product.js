/**
 * check_product.js
 * 
 * Simple utility script to inspect a product's visibility status in the database.
 * Run in terminal to avoid copy-pasting complex node -e commands.
 *
 * Usage:
 *   NODE_ENV=production node scripts/check_product.js "Bata"
 */

const { Product } = require('../models/index');
const { Op } = require('sequelize');

async function main() {
  const searchTerm = process.argv[2] || 'Bata';
  console.log(`🔍 Searching for products containing: "${searchTerm}"...\n`);

  const products = await Product.findAll({
    where: {
      name: {
        [Op.like]: `%${searchTerm}%`
      }
    }
  });

  if (products.length === 0) {
    console.log(`❌ No products found matching "${searchTerm}".`);
    process.exit(0);
  }

  console.log(`Found ${products.length} matching product(s):\n`);
  
  products.forEach(p => {
    console.log('--------------------------------------------------');
    console.log(`ID:                ${p.id}`);
    console.log(`Name:              ${p.name}`);
    console.log(`Approved:          ${p.approved} (must be true)`);
    console.log(`Review Status:     ${p.reviewStatus} (must be "approved")`);
    console.log(`Status:            ${p.status} (must be "active")`);
    console.log(`Visibility Status: ${p.visibilityStatus} (must be "visible")`);
    console.log(`Is Active:         ${p.isActive} (must be true)`);
    
    const visible = p.approved === true && 
                    p.reviewStatus === 'approved' && 
                    p.status === 'active' && 
                    p.visibilityStatus === 'visible' && 
                    p.isActive === true;
                    
    if (visible) {
      console.log('✅ STATUS: VISIBLE to public pages!');
    } else {
      console.log('❌ STATUS: HIDDEN from public pages!');
    }
  });
  console.log('--------------------------------------------------\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
