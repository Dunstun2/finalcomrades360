const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../database/database');

async function runMigrations() {
  const isStatusOnly = process.argv.includes('--status');
  console.log(`\n========================================`);
  console.log(`🚀 Sequelize Database Migration Runner`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Dialect: ${sequelize.getDialect()}`);
  console.log(`========================================\n`);

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.\n');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Ensure SequelizeMeta table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SequelizeMeta (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    // 2. Fetch already executed migrations
    const [executedRows] = await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name ASC;');
    const executedSet = new Set(executedRows.map(row => row.name));

    // 3. Read migration files from migrations directory
    const migrationsDir = path.resolve(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ Migrations directory not found at: ${migrationsDir}`);
      process.exit(1);
    }

    const allFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort((a, b) => a.localeCompare(b));

    const pendingFiles = allFiles.filter(file => !executedSet.has(file));

    if (isStatusOnly) {
      console.log(`📊 Migration Status (${executedSet.size} executed, ${pendingFiles.length} pending):\n`);
      for (const file of allFiles) {
        if (executedSet.has(file)) {
          console.log(`  [UP]      ${file}`);
        } else {
          console.log(`  [PENDING] ${file}`);
        }
      }
      console.log('\n');
      await sequelize.close();
      return;
    }

    if (pendingFiles.length === 0) {
      console.log('✅ All migrations are already up to date! (0 pending)\n');
      await sequelize.close();
      return;
    }

    console.log(`Found ${pendingFiles.length} pending migration(s) to execute:\n`);

    for (const file of pendingFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`⏳ Applying: ${file}...`);
      const migration = require(filePath);

      if (typeof migration.up !== 'function') {
        console.warn(`⚠️ Warning: ${file} does not export an 'up' function. Skipping.`);
        continue;
      }

      await migration.up(queryInterface, Sequelize);

      // Record in SequelizeMeta
      await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (:name);', {
        replacements: { name: file }
      });

      console.log(`✅ Applied:  ${file}`);
    }

    console.log('\n🎉 All pending migrations completed successfully!\n');
    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
