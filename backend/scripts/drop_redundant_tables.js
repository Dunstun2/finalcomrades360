const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with the SQLite database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
});

async function dropCategoriesTable() {
    try {
        console.log('🚀 Starting dropping of redundant categories table...');

        // Check if table exists first
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='categories';");

        if (results.length > 0) {
            console.log('📝 Table "categories" found. Dropping it...');
            await sequelize.query('DROP TABLE IF EXISTS "categories";');
            console.log('✅ Table "categories" dropped successfully.');
        } else {
            console.log('ℹ️ Table "categories" does not exist.');
        }

        // Also check for subcategories (old name)
        const [subResults] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Subcategories';");
        if (subResults.length > 0) {
            console.log('📝 Table "Subcategories" found. Dropping it (should have been renamed to Subcategory)...');
            await sequelize.query('DROP TABLE IF EXISTS "Subcategories";');
            console.log('✅ Table "Subcategories" dropped successfully.');
        }

        console.log('👍 Done!');
    } catch (error) {
        console.error('❌ Error dropping table:', error);
    } finally {
        await sequelize.close();
    }
}

dropCategoriesTable();
