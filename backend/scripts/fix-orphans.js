const { FastFood, Product, User } = require('../models');

async function fixOrphans() {
  try {
    console.log('🔧 Starting database orphan cleanup...');

    // Find the main superadmin
    const mainAdmin = await User.findOne({ where: { role: 'superadmin' } });
    if (!mainAdmin) {
      console.error('❌ CRITICAL ERROR: No superadmin found in database to re-assign items to.');
      process.exit(1);
    }
    console.log(`✅ Using Admin Account: ${mainAdmin.email} (ID: ${mainAdmin.id}) as the new owner.`);

    // Fix FastFood
    const foods = await FastFood.findAll();
    let foodFixCount = 0;
    for (const f of foods) {
      const u = await User.findByPk(f.vendor);
      if (!u) {
        await f.update({ vendor: mainAdmin.id });
        console.log(`   Fixed FastFood [${f.id}]: ${f.name}`);
        foodFixCount++;
      }
    }

    // Fix Products
    const prods = await Product.findAll();
    let productFixCount = 0;
    for (const p of prods) {
      const u = await User.findByPk(p.sellerId || p.userId);
      if (!u) {
        const field = p.sellerId ? 'sellerId' : 'userId';
        await p.update({ [field]: mainAdmin.id });
        console.log(`   Fixed Product [${p.id}]: ${p.name}`);
        productFixCount++;
      }
    }

    console.log(`\n✨ FINISHED!`);
    console.log(`   • FastFood Fixed: ${foodFixCount}`);
    console.log(`   • Products Fixed: ${productFixCount}`);
    process.exit(0);

  } catch (err) {
    console.error('❌ ERROR during fix:', err.message);
    process.exit(1);
  }
}

fixOrphans();
