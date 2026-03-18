const { sequelize } = require('../database/database');

async function fixWalletSchema() {
    try {
        console.log('🔄 Checking Wallet table schema...');
        const tableInfo = await sequelize.getQueryInterface().describeTable('Wallet');

        if (!tableInfo.pendingBalance) {
            console.log('➕ Adding pendingBalance column...');
            await sequelize.query('ALTER TABLE Wallet ADD COLUMN pendingBalance FLOAT DEFAULT 0;');
            console.log('✅ Added pendingBalance');
        } else {
            console.log('ℹ️ pendingBalance column already exists');
        }

        if (!tableInfo.successBalance) {
            console.log('➕ Adding successBalance column...');
            await sequelize.query('ALTER TABLE Wallet ADD COLUMN successBalance FLOAT DEFAULT 0;');
            console.log('✅ Added successBalance');
        } else {
            console.log('ℹ️ successBalance column already exists');
        }

        console.log('✨ Wallet schema fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to fix Wallet schema:', error);
        process.exit(1);
    }
}

fixWalletSchema();
