const { sequelize } = require('./models');

async function applyProductionFixes() {
  console.log('🚀 Starting production database fixes...');
  
  const queries = [
    // 1. Create Batches table
    `CREATE TABLE IF NOT EXISTS \`Batches\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`startTime\` VARCHAR(255) NOT NULL,
      \`endTime\` VARCHAR(255) NOT NULL,
      \`expectedDelivery\` VARCHAR(255) NOT NULL,
      \`status\` ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
      \`isAutomated\` TINYINT(1) DEFAULT 0,
      \`createdAt\` DATETIME NOT NULL,
      \`updatedAt\` DATETIME NOT NULL
    ) ENGINE=InnoDB;`,

    // 2. Update Order table
    `ALTER TABLE \`Order\` ADD COLUMN IF NOT EXISTS \`batchId\` INT NULL;`,
    `ALTER TABLE \`Order\` ADD COLUMN IF NOT EXISTS \`thankYouSent\` TINYINT(1) DEFAULT 0;`,
    `ALTER TABLE \`Order\` ADD COLUMN IF NOT EXISTS \`deliveryTimePreference\` VARCHAR(255) NULL;`,
    
    // 3. Add foreign key (wrapped in try-catch in case it exists)
    `ALTER TABLE \`Order\` ADD CONSTRAINT \`fk_order_batch\` FOREIGN KEY (\`batchId\`) REFERENCES \`Batches\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;`,

    // 4. Update HeroPromotions table
    `ALTER TABLE \`HeroPromotions\` ADD COLUMN IF NOT EXISTS \`trustPoints\` TEXT NULL;`,

    // 5. Update MarketingAnalytics table
    `ALTER TABLE \`MarketingAnalytics\` ADD COLUMN IF NOT EXISTS \`fastFoodId\` INT NULL;`,
    `ALTER TABLE \`MarketingAnalytics\` ADD COLUMN IF NOT EXISTS \`serviceId\` INT NULL;`,
    `ALTER TABLE \`MarketingAnalytics\` MODIFY COLUMN \`marketerId\` INT NULL;`,
    `ALTER TABLE \`MarketingAnalytics\` MODIFY COLUMN \`productId\` INT NULL;`,

    // 6. Update ProductView table
    `ALTER TABLE \`ProductView\` ADD COLUMN IF NOT EXISTS \`fastFoodId\` INT NULL;`,
    `ALTER TABLE \`ProductView\` ADD COLUMN IF NOT EXISTS \`serviceId\` INT NULL;`,
    `ALTER TABLE \`ProductView\` MODIFY COLUMN \`productId\` INT NULL;`
  ];

  for (const query of queries) {
    try {
      console.log(`Running: ${query.substring(0, 50)}...`);
      await sequelize.query(query);
      console.log('✅ Success');
    } catch (error) {
      // Ignore "duplicate column" or "duplicate key" errors
      if (error.message.includes('Duplicate column name') || error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
        console.log('ℹ️ Skip: Already exists');
      } else {
        console.error('❌ Error executing query:', error.message);
      }
    }
  }

  console.log('✨ All production fixes applied.');
  process.exit(0);
}

applyProductionFixes().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
