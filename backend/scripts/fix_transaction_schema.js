const { sequelize } = require('../database/database');

async function fixTransactionSchema() {
    try {
        console.log('🔄 Checking Transaction table schema...');
        const tableInfo = await sequelize.getQueryInterface().describeTable('Transaction');

        if (!tableInfo.description) {
            console.log('➕ Adding description column...');
            await sequelize.query('ALTER TABLE `Transaction` ADD COLUMN description VARCHAR(255) NULL;');
            console.log('✅ Added description');
        } else {
            console.log('ℹ️ description column already exists');
        }

        if (!tableInfo.note) {
            console.log('➕ Adding note column...');
            await sequelize.query('ALTER TABLE `Transaction` ADD COLUMN note VARCHAR(255) NULL;');
            console.log('✅ Added note');
        } else {
            console.log('ℹ️ note column already exists');
        }

        console.log('✨ Transaction schema fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to fix Transaction schema:', error);
        process.exit(1);
    }
}

fixTransactionSchema();
