const { sequelize } = require('./models');

async function applyProductionFixes() {
  console.log('🚀 Starting production database fixes (Standard MySQL Compatibility)...');
  
  // Helper to check if a column exists
  async function columnExists(table, column) {
    try {
      const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
      return results.length > 0;
    } catch (err) {
      return false;
    }
  }

  // Helper to safely add a column
  async function addColumn(table, column, definition) {
    if (await columnExists(table, column)) {
      console.log(`ℹ️ Skip: Column \`${column}\` already exists in \`${table}\``);
      return;
    }
    try {
      console.log(`Adding: \`${column}\` to \`${table}\`...`);
      await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log('✅ Success');
    } catch (error) {
      console.error(`❌ Error adding column \`${column}\`:`, error.message);
    }
  }

  // 1. Create Batches table
  try {
    console.log('Creating Batches table if missing...');
    await sequelize.query(`CREATE TABLE IF NOT EXISTS \`Batches\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`startTime\` VARCHAR(255) NOT NULL,
      \`endTime\` VARCHAR(255) NOT NULL,
      \`expectedDelivery\` VARCHAR(255) NOT NULL,
      \`status\` ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
      \`isAutomated\` TINYINT(1) DEFAULT 0,
      \`createdAt\` DATETIME NOT NULL,
      \`updatedAt\` DATETIME NOT NULL
    ) ENGINE=InnoDB;`);
    console.log('✅ Success');
  } catch (err) {
    console.error('❌ Error creating Batches table:', err.message);
  }

  // 2. Update Order table
  await addColumn('Order', 'batchId', 'INT NULL');
  await addColumn('Order', 'thankYouSent', 'TINYINT(1) DEFAULT 0');
  await addColumn('Order', 'deliveryTimePreference', 'VARCHAR(255) NULL');
  
  // 3. Add foreign key (wrap in try-catch)
  try {
    console.log('Adding foreign key fk_order_batch...');
    await sequelize.query(`ALTER TABLE \`Order\` ADD CONSTRAINT \`fk_order_batch\` FOREIGN KEY (\`batchId\`) REFERENCES \`Batches\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;`);
    console.log('✅ Success');
  } catch (error) {
    if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
      console.log('ℹ️ Skip: Foreign key already exists');
    } else {
      console.error('❌ Error adding foreign key:', error.message);
    }
  }

  // 4. Update HeroPromotions table
  await addColumn('HeroPromotions', 'trustPoints', 'TEXT NULL');

  // 5. Update MarketingAnalytics table
  await addColumn('MarketingAnalytics', 'fastFoodId', 'INT NULL');
  await addColumn('MarketingAnalytics', 'serviceId', 'INT NULL');
  
  try {
    console.log('Modifying columns in MarketingAnalytics...');
    await sequelize.query(`ALTER TABLE \`MarketingAnalytics\` MODIFY COLUMN \`marketerId\` INT NULL`);
    await sequelize.query(`ALTER TABLE \`MarketingAnalytics\` MODIFY COLUMN \`productId\` INT NULL`);
    console.log('✅ Success');
  } catch (err) {
    console.error('❌ Error modifying MarketingAnalytics:', err.message);
  }

  // 6. Update ProductView table
  await addColumn('ProductView', 'fastFoodId', 'INT NULL');
  await addColumn('ProductView', 'serviceId', 'INT NULL');
  
  try {
    console.log('Modifying columns in ProductView...');
    await sequelize.query(`ALTER TABLE \`ProductView\` MODIFY COLUMN \`productId\` INT NULL`);
    console.log('✅ Success');
  } catch (err) {
    console.error('❌ Error modifying ProductView:', err.message);
  }

  console.log('✨ All production fixes applied.');
  process.exit(0);
}

applyProductionFixes().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
