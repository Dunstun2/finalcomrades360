// Script to manually or programmatically verify and add any missing columns to HeroPromotions table in production
const { sequelize, ensureHeroPromotionsSchema } = require('../database/database');

async function run() {
  try {
    console.log('🔄 Checking database connection and HeroPromotions table schema...');
    console.log(`📊 Dialect: ${sequelize.options.dialect}, Host: ${sequelize.config.host || 'local'}`);
    
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    const result = await ensureHeroPromotionsSchema(sequelize);
    console.log('📋 Sync Result:', JSON.stringify(result, null, 2));

    if (result.ok) {
      console.log(`\n🎉 Success! Table '${result.table}' is fully up to date.`);
      if (result.addedCount > 0) {
        console.log(`➕ Added ${result.addedCount} missing column(s): ${result.added.join(', ')}`);
      } else {
        console.log('✨ All required columns already exist. Nothing missing!');
      }
    } else {
      console.error('❌ Sync failed:', result.error);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error running hero promotions schema sync:', err);
    process.exit(1);
  }
}

run();
