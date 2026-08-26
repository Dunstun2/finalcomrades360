// Script to check which tables exist in the production database
const { sequelize, Sequelize } = require('../database/database');

async function checkProductionTables() {
  try {
    console.log('🔍 Checking production database...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database:', sequelize.options.dialect);
    console.log('Host:', sequelize.config.host);
    console.log('Database name:', sequelize.config.database);
    console.log('---');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Get all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log(`📊 Found ${tables.length} tables in database:\n`);
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    tableNames.sort().forEach(name => {
      console.log(`  ✓ ${name}`);
    });
    
    // Check specifically for blog-related tables
    console.log('\n🔍 Blog-related tables:');
    const blogTables = ['BlogPost', 'BlogComment', 'BlogLike', 'BlogRating'];
    
    for (const tableName of blogTables) {
      const exists = tableNames.includes(tableName);
      if (exists) {
        console.log(`  ✅ ${tableName} - EXISTS`);
        
        // Get column count
        const [columns] = await sequelize.query(`DESCRIBE ${tableName}`);
        console.log(`     (${columns.length} columns)`);
      } else {
        console.log(`  ❌ ${tableName} - MISSING`);
      }
    }
    
    // Check User table (required for foreign keys)
    console.log('\n🔍 Checking required tables:');
    const userExists = tableNames.includes('User');
    if (userExists) {
      const [userCount] = await sequelize.query("SELECT COUNT(*) as count FROM User");
      console.log(`  ✅ User table - EXISTS (${userCount[0].count} users)`);
    } else {
      console.log(`  ❌ User table - MISSING (CRITICAL!)`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n🔴 Cannot connect to database. Check:');
      console.error('  - DB_HOST is correct');
      console.error('  - DB credentials are valid');
      console.error('  - Database server is running');
      console.error('  - Firewall allows connection');
    }
    
    console.error('\nFull error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkProductionTables();
