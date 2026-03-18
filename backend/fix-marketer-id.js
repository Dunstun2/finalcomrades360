const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function fixSchema() {
    console.log('--- Starting Database Schema Fix (marketerId) ---');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('Order');

    if (!tableInfo.marketerId) {
        console.log('Adding "marketerId" column to "Order" table...');
        try {
            await queryInterface.addColumn('Order', 'marketerId', {
                type: require('sequelize').DataTypes.INTEGER,
                allowNull: true
            });
            console.log('✅ Successfully added "marketerId" column.');
        } catch (error) {
            console.error('❌ Failed to add "marketerId" column:', error.message);
        }
    } else {
        console.log('✅ "marketerId" column already exists.');
    }

    process.exit(0);
}

fixSchema();
