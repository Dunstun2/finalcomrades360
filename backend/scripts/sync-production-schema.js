/**
 * sync-production-schema.js
 *
 * Safely adds ANY missing columns from Sequelize model definitions to the
 * production MySQL database — column by column, skipping existing ones.
 * Does NOT touch foreign keys, indexes, or existing data.
 *
 * Usage (from /home/vdranjxy/comrades-master/):
 *   node scripts/sync-production-schema.js
 */

const path = require('path');
const { DataTypes } = require('sequelize');

const dbPath = path.resolve(__dirname, '..', 'database', 'database');
console.log('🔧 Loading database connection...');
const { sequelize } = require(dbPath);

console.log('🔧 Loading all models...');
require(path.resolve(__dirname, '..', 'models'));

async function syncSchema() {
  const queryInterface = sequelize.getQueryInterface();
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection verified.\n');

    // Get all registered models
    const models = sequelize.models;
    const modelNames = Object.keys(models);
    console.log(`📋 Found ${modelNames.length} models to check.\n`);

    for (const modelName of modelNames) {
      const model = models[modelName];
      const tableName = model.getTableName();

      // Check if table exists
      let tableExists = false;
      try {
        const tables = await queryInterface.showAllTables();
        tableExists = tables.includes(typeof tableName === 'string' ? tableName : tableName.tableName);
      } catch (e) {
        console.log(`  ⚠️  Could not check table for model ${modelName}: ${e.message}`);
        continue;
      }

      if (!tableExists) {
        console.log(`  ⏭️  [${modelName}] Table '${tableName}' does not exist — skipping`);
        continue;
      }

      // Get current columns in the DB table
      let existingColumns = {};
      try {
        existingColumns = await queryInterface.describeTable(tableName);
      } catch (e) {
        console.log(`  ⚠️  Could not describe table '${tableName}': ${e.message}`);
        continue;
      }

      // Get columns defined in the model
      const modelAttributes = model.rawAttributes;
      let addedForModel = 0;

      for (const [colName, attr] of Object.entries(modelAttributes)) {
        // Skip primary keys and virtual fields
        if (attr.primaryKey || attr.type instanceof DataTypes.VIRTUAL) continue;

        const dbColName = attr.field || colName;

        if (!existingColumns[dbColName]) {
          // Build column definition
          const colDef = { type: attr.type };
          if (attr.allowNull === false && attr.defaultValue !== undefined) {
            colDef.allowNull = false;
            colDef.defaultValue = attr.defaultValue;
          } else {
            colDef.allowNull = true;
            if (attr.defaultValue !== undefined) colDef.defaultValue = attr.defaultValue;
          }

          try {
            await queryInterface.addColumn(tableName, dbColName, colDef);
            console.log(`  ✅ [${modelName}] Added column '${dbColName}'`);
            totalAdded++;
            addedForModel++;
          } catch (e) {
            console.log(`  ❌ [${modelName}] Failed to add '${dbColName}': ${e.message}`);
            totalErrors++;
          }
        } else {
          totalSkipped++;
        }
      }

      if (addedForModel === 0) {
        console.log(`  ✔️  [${modelName}] All columns present`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✨ Schema sync complete!`);
    console.log(`   ✅ Columns added:   ${totalAdded}`);
    console.log(`   ⏭️  Columns skipped: ${totalSkipped}`);
    console.log(`   ❌ Errors:          ${totalErrors}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (err) {
    console.error('\n💥 Schema sync FAILED:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

syncSchema();
