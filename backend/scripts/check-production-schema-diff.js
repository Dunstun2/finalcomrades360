// Script to check differences between production DB and current models
// This is a DRY RUN - it only shows what WOULD change, without modifying anything
const { sequelize } = require('../database/database');
const models = require('../database/models.registry');

async function checkSchemaDifferences() {
  try {
    console.log('🔍 Checking schema differences (DRY RUN - NO CHANGES WILL BE MADE)');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database:', sequelize.options.dialect);
    console.log('Host:', sequelize.config.host);
    console.log('Database name:', sequelize.config.database);
    console.log('---\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Get all existing tables
    const [existingTables] = await sequelize.query("SHOW TABLES");
    const existingTableNames = existingTables.map(t => Object.values(t)[0]);
    
    // Get all models
    const modelNames = Object.keys(models).filter(key => 
      models[key] && 
      typeof models[key] === 'object' && 
      models[key].tableName &&
      !['sequelize', 'Sequelize', 'Op'].includes(key)
    );
    
    console.log('='.repeat(80));
    console.log('SCHEMA COMPARISON REPORT');
    console.log('='.repeat(80));
    console.log('');
    
    let totalDifferences = 0;
    const report = {
      missingTables: [],
      extraTables: [],
      missingColumns: [],
      extraColumns: [],
      typeMismatches: []
    };
    
    // Check for missing tables
    for (const modelName of modelNames) {
      const model = models[modelName];
      if (!model || !model.tableName) continue;
      
      const tableName = model.tableName;
      
      if (!existingTableNames.includes(tableName)) {
        report.missingTables.push(tableName);
        console.log(`❌ MISSING TABLE: ${tableName}`);
        console.log(`   Model exists but table not found in database`);
        console.log('');
        totalDifferences++;
      } else {
        // Compare columns
        const [dbColumns] = await sequelize.query(`DESCRIBE ${tableName}`);
        const dbColumnNames = dbColumns.map(c => c.Field);
        
        // Get model attributes
        const modelAttributes = Object.keys(model.rawAttributes);
        
        // Find missing columns (in model but not in DB)
        const missingCols = modelAttributes.filter(attr => !dbColumnNames.includes(attr));
        if (missingCols.length > 0) {
          report.missingColumns.push({ table: tableName, columns: missingCols });
          console.log(`⚠️  ${tableName} - MISSING COLUMNS:`);
          missingCols.forEach(col => {
            const attrDef = model.rawAttributes[col];
            console.log(`   + ${col}: ${attrDef.type.key || attrDef.type.constructor.name}`);
          });
          console.log('');
          totalDifferences++;
        }
        
        // Find extra columns (in DB but not in model)
        const extraCols = dbColumnNames.filter(col => !modelAttributes.includes(col));
        if (extraCols.length > 0) {
          report.extraColumns.push({ table: tableName, columns: extraCols });
          console.log(`ℹ️  ${tableName} - EXTRA COLUMNS IN DB (not in model):`);
          extraCols.forEach(col => {
            const dbCol = dbColumns.find(c => c.Field === col);
            console.log(`   - ${col}: ${dbCol.Type}`);
          });
          console.log('   (These will be kept unless you manually remove them)');
          console.log('');
          totalDifferences++;
        }
      }
    }
    
    // Check for extra tables in DB
    const modelTableNames = modelNames.map(name => models[name].tableName).filter(Boolean);
    const extraTables = existingTableNames.filter(table => 
      !modelTableNames.includes(table) && 
      table !== 'SequelizeMeta'
    );
    
    if (extraTables.length > 0) {
      report.extraTables = extraTables;
      console.log('ℹ️  EXTRA TABLES IN DB (no model found):');
      extraTables.forEach(table => console.log(`   - ${table}`));
      console.log('   (These will be kept unless you manually drop them)');
      console.log('');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total models: ${modelNames.length}`);
    console.log(`Existing tables in DB: ${existingTableNames.length}`);
    console.log('');
    console.log(`❌ Missing tables: ${report.missingTables.length}`);
    console.log(`⚠️  Tables with missing columns: ${report.missingColumns.length}`);
    console.log(`ℹ️  Tables with extra columns: ${report.extraColumns.length}`);
    console.log(`ℹ️  Extra tables in DB: ${report.extraTables.length}`);
    console.log('');
    
    if (totalDifferences === 0 && report.missingTables.length === 0) {
      console.log('✅ Your database schema is UP TO DATE! No sync needed.');
    } else {
      console.log('⚠️  CHANGES NEEDED! Run sync script to update:');
      console.log('   NODE_ENV=production node scripts/sync-all-production-tables.js');
    }
    
    console.log('');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error during schema check:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkSchemaDifferences();
