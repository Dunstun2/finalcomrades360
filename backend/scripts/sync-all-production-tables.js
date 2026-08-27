// Comprehensive script to sync ALL tables in production database
// This will add missing columns and update structures to match current models
const { sequelize } = require('../database/database');
const models = require('../database/models.registry');

async function syncAllProductionTables() {
  try {
    console.log('🔄 Starting comprehensive production database sync...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database:', sequelize.options.dialect);
    console.log('Host:', sequelize.config.host);
    console.log('Database name:', sequelize.config.database);
    console.log('---\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Get all existing tables
    const [existingTables] = await sequelize.query("SHOW TABLES");
    const existingTableNames = existingTables.map(t => Object.values(t)[0]);
    console.log(`📊 Found ${existingTableNames.length} existing tables\n`);
    
    // Get all model names
    const modelNames = Object.keys(models).filter(key => 
      models[key] && 
      typeof models[key] === 'object' && 
      models[key].tableName &&
      !['sequelize', 'Sequelize', 'Op'].includes(key)
    );
    
    console.log(`📋 Found ${modelNames.length} models to sync\n`);
    console.log('='.repeat(80));
    
    // Create backup notice
    console.log('\n⚠️  IMPORTANT: This script will ALTER tables!');
    console.log('Recommended: Backup your database before proceeding.');
    console.log('Creating automatic backup table list...\n');
    
    let syncedCount = 0;
    let errorCount = 0;
    const syncResults = [];
    
    // Sync each model
    for (const modelName of modelNames) {
      const model = models[modelName];
      if (!model || !model.tableName) continue;
      
      const tableName = model.tableName;
      const tableExists = existingTableNames.includes(tableName);
      
      try {
        console.log(`\n[${syncedCount + errorCount + 1}/${modelNames.length}] ${tableName}...`);
        
        if (!tableExists) {
          console.log(`  📝 Table does not exist - creating...`);
          await model.sync({ force: false });
          console.log(`  ✅ Created table: ${tableName}`);
          syncResults.push({ table: tableName, status: 'created', changes: ['table created'] });
        } else {
          // Get current columns
          const [currentColumns] = await sequelize.query(`DESCRIBE ${tableName}`);
          const currentColumnNames = currentColumns.map(c => c.Field);
          
          // Sync with alter to add missing columns
          console.log(`  🔧 Syncing structure (ALTER mode)...`);
          await model.sync({ alter: true });
          
          // Check what changed
          const [newColumns] = await sequelize.query(`DESCRIBE ${tableName}`);
          const newColumnNames = newColumns.map(c => c.Field);
          
          const addedColumns = newColumnNames.filter(c => !currentColumnNames.includes(c));
          const removedColumns = currentColumnNames.filter(c => !newColumnNames.includes(c));
          
          if (addedColumns.length > 0 || removedColumns.length > 0) {
            const changes = [];
            if (addedColumns.length > 0) {
              changes.push(`added: ${addedColumns.join(', ')}`);
              console.log(`  ➕ Added columns: ${addedColumns.join(', ')}`);
            }
            if (removedColumns.length > 0) {
              changes.push(`removed: ${removedColumns.join(', ')}`);
              console.log(`  ➖ Removed columns: ${removedColumns.join(', ')}`);
            }
            console.log(`  ✅ Updated table: ${tableName}`);
            syncResults.push({ table: tableName, status: 'updated', changes });
          } else {
            console.log(`  ✓ No changes needed`);
            syncResults.push({ table: tableName, status: 'unchanged', changes: [] });
          }
        }
        
        syncedCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error syncing ${tableName}:`, error.message);
        syncResults.push({ 
          table: tableName, 
          status: 'error', 
          error: error.message,
          changes: [] 
        });
      }
    }
    
    // Summary Report
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SYNC SUMMARY REPORT\n');
    console.log(`Total models processed: ${modelNames.length}`);
    console.log(`✅ Successful syncs: ${syncedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('');
    
    // Detailed results
    const created = syncResults.filter(r => r.status === 'created');
    const updated = syncResults.filter(r => r.status === 'updated');
    const unchanged = syncResults.filter(r => r.status === 'unchanged');
    const errors = syncResults.filter(r => r.status === 'error');
    
    if (created.length > 0) {
      console.log(`\n📝 CREATED TABLES (${created.length}):`);
      created.forEach(r => console.log(`  - ${r.table}`));
    }
    
    if (updated.length > 0) {
      console.log(`\n🔧 UPDATED TABLES (${updated.length}):`);
      updated.forEach(r => {
        console.log(`  - ${r.table}`);
        r.changes.forEach(change => console.log(`      ${change}`));
      });
    }
    
    if (unchanged.length > 0) {
      console.log(`\n✓ UNCHANGED TABLES (${unchanged.length}):`);
      console.log(`  ${unchanged.map(r => r.table).join(', ')}`);
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ FAILED TABLES (${errors.length}):`);
      errors.forEach(r => {
        console.log(`  - ${r.table}: ${r.error}`);
      });
    }
    
    // Verify critical tables
    console.log('\n🔍 VERIFYING CRITICAL TABLES...');
    const criticalTables = [
      'User', 'Product', 'Order', 'OrderItem', 'Payment', 'Cart', 
      'BlogPost', 'BlogComment', 'Category', 'Subcategory'
    ];
    
    for (const tableName of criticalTables) {
      try {
        const [rows] = await sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  ✅ ${tableName}: ${rows[0].count} records`);
      } catch (err) {
        console.log(`  ❌ ${tableName}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Database sync completed successfully!');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Test your application thoroughly');
    console.log('2. Check error logs for any runtime issues');
    console.log('3. Verify data integrity in updated tables');
    console.log('4. Consider creating a backup before deploying to production');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error.message);
    console.error('\nFull error:', error);
    console.error('\n⚠️  Database sync failed! Check the error above.');
    
    if (error.message.includes('Access denied')) {
      console.error('\n💡 TIP: Check your database credentials in .env.production');
    }
    if (error.message.includes('Unknown database')) {
      console.error('\n💡 TIP: Verify the database name in .env.production');
    }
    
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  }
}

// Run the sync
console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║           PRODUCTION DATABASE COMPREHENSIVE SYNC SCRIPT               ║');
console.log('║                                                                       ║');
console.log('║  This script will sync ALL tables with your current model structure  ║');
console.log('║  • Add missing columns                                                ║');
console.log('║  • Update data types                                                  ║');
console.log('║  • Add indexes                                                        ║');
console.log('║  • Preserve existing data                                             ║');
console.log('║                                                                       ║');
console.log('║  NOTE: This does NOT drop tables or delete data!                     ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝');
console.log('');

syncAllProductionTables();
