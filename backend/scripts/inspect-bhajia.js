const { FastFood, User } = require('../models');
const { Op } = require('sequelize');

async function inspectBhajia() {
  try {
    console.log('🔍 Inspecting "bhajia" in database...');
    const items = await FastFood.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%bhajia%' } },
          { sizeVariants: { [Op.like]: '%bhajia%' } },
          { comboOptions: { [Op.like]: '%bhajia%' } }
        ]
      },
      include: [{ model: User, as: 'vendorDetail', attributes: ['id', 'name', 'status'] }]
    });

    if (items.length === 0) {
      console.log('❌ No items found matching "bhajia"');
      process.exit(0);
    }

    console.log(`✅ Found ${items.length} items:`);
    items.forEach(item => {
      console.log('---');
      console.log(`ID: ${item.id}`);
      console.log(`Name: ${item.name}`);
      console.log(`Status: ${item.status} | Review: ${item.reviewStatus} | Approved: ${item.approved} | Active: ${item.isActive}`);
      console.log(`Vendor: ${item.vendorDetail?.name} (Verified: ${item.vendorDetail?.isVerified} | AppStatus: ${item.vendorDetail?.applicationStatus})`);
      console.log(`Price: Base=${item.basePrice} | Display=${item.displayPrice}`);
      
      try {
        const variants = typeof item.sizeVariants === 'string' ? JSON.parse(item.sizeVariants) : item.sizeVariants;
        console.log(`Variants: ${variants?.length || 0}`);
      } catch(e) { console.log('Variants: PARSE ERROR'); }
      
      try {
        const combos = typeof item.comboOptions === 'string' ? JSON.parse(item.comboOptions) : item.comboOptions;
        console.log(`Combos: ${combos?.length || 0}`);
      } catch(e) { console.log('Combos: PARSE ERROR'); }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Inspection Failed:', error);
    process.exit(1);
  }
}

inspectBhajia();
