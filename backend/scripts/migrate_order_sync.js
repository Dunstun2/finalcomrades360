const { sequelize } = require('../database/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
    console.log('--- Starting Migration: Add Order Sync Fields ---');

    try {
        const tableInfo = await sequelize.query("PRAGMA table_info(`Order`)", { type: QueryTypes.SELECT });
        const columns = tableInfo.map(c => c.name);

        if (!columns.includes('processingBy')) {
            console.log('Adding column: processingBy');
            await sequelize.query('ALTER TABLE `Order` ADD COLUMN `processingBy` INTEGER NULL');
        }

        if (!columns.includes('processingAction')) {
            console.log('Adding column: processingAction');
            await sequelize.query('ALTER TABLE `Order` ADD COLUMN `processingAction` VARCHAR(255) NULL');
        }

        if (!columns.includes('processingTimeout')) {
            console.log('Adding column: processingTimeout');
            await sequelize.query('ALTER TABLE `Order` ADD COLUMN `processingTimeout` DATETIME NULL');
        }

        console.log('✅ Migration successful!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
