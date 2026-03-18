const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

async function checkSchema() {
    try {
        // Fast Food Debugging Tasks:
        // - [x] Debug missing Fast Food items in Marketer Dashboard
        // - [x] Analyze DB and Backend filtering logic
        // - [x] Update FastFood model and controller
        // - [x] Verify API returns marketing-enabled items
        // - [/] Instrument `marketerWalletController.js` with detailed error logging
        // - [x] Identify and fix root cause based on backend logs/error details (Fixed SQLITE_ERROR by using `reviewStatus` instead of `status`).
        const [results] = await sequelize.query("PRAGMA table_info(FastFoods);");
        console.log('Columns in FastFoods:');
        results.forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
