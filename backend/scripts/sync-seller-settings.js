
const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

async function syncSellerSettings() {
  try {
    console.log('Starting DB sync for Seller Auto-Confirm settings...');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('User');

    if (!tableInfo.autoConfirmFastFood) {
      console.log('Adding autoConfirmFastFood column...');
      await queryInterface.addColumn('User', 'autoConfirmFastFood', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.autoConfirmProducts) {
      console.log('Adding autoConfirmProducts column...');
      await queryInterface.addColumn('User', 'autoConfirmProducts', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.defaultProductShippingType) {
      console.log('Adding defaultProductShippingType column...');
      await queryInterface.addColumn('User', 'defaultProductShippingType', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    console.log('✅ Seller settings columns synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing columns:', error);
    process.exit(1);
  }
}

syncSellerSettings();
