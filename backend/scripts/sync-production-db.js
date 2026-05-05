const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

async function syncProductionDb() {
  try {
    console.log('🚀 Starting Production Database Sync...');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('User');

    // 1. Check for businessLat
    if (!tableInfo.businessLat) {
      console.log('➕ Adding column: businessLat');
      await queryInterface.addColumn('User', 'businessLat', {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
      });
    }

    // 2. Check for autoConfirmFastFood
    if (!tableInfo.autoConfirmFastFood) {
      console.log('➕ Adding column: autoConfirmFastFood');
      await queryInterface.addColumn('User', 'autoConfirmFastFood', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    // 3. Check for autoConfirmProducts
    if (!tableInfo.autoConfirmProducts) {
      console.log('➕ Adding column: autoConfirmProducts');
      await queryInterface.addColumn('User', 'autoConfirmProducts', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    // 4. Check for defaultProductShippingType
    if (!tableInfo.defaultProductShippingType) {
      console.log('➕ Adding column: defaultProductShippingType');
      await queryInterface.addColumn('User', 'defaultProductShippingType', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    console.log('✅ Database sync completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync Failed:', error.message);
    process.exit(1);
  }
}

syncProductionDb();
