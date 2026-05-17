/**
 * sync-production-schema.js
 * 
 * Runs sequelize.sync({ alter: true }) against the production database.
 * This SAFELY adds any missing columns from the model definitions to
 * the production MySQL tables WITHOUT dropping or overwriting data.
 *
 * Usage (from /home/vdranjxy/comrades-master/):
 *   node scripts/sync-production-schema.js
 */

const path = require('path');

// Resolve paths relative to /comrades-master/ (production root)
const dbPath = path.resolve(__dirname, '..', 'database', 'database');
const modelsPath = path.resolve(__dirname, '..', 'models');

console.log('🔧 Loading database connection...');
const { sequelize } = require(dbPath);

console.log('🔧 Loading all models...');
require(modelsPath); // registers all models on the sequelize instance

async function syncSchema() {
  try {
    console.log('\n🚀 Starting Production Schema Sync (alter: true)...');
    console.log('⚠️  This will ADD missing columns but will NOT drop or modify existing data.\n');

    await sequelize.authenticate();
    console.log('✅ Database connection verified.\n');

    // alter: true → adds missing columns, renames nothing, drops nothing
    await sequelize.sync({ alter: true });

    console.log('\n✨ Schema sync complete! All model columns now exist in the database.');
  } catch (err) {
    console.error('\n💥 Schema sync FAILED:', err.message);
    if (err.parent) {
      console.error('   SQL Error:', err.parent.sqlMessage || err.parent.message);
      console.error('   SQL:', err.parent.sql);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

syncSchema();
