
const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

async function fixBusinessLat() {
  try {
    console.log('Checking for missing businessLat column...');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('User');

    if (!tableInfo.businessLat) {
      console.log('Adding businessLat column to User table...');
      await queryInterface.addColumn('User', 'businessLat', {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
      });
      console.log('✅ businessLat column added successfully.');
    } else {
      console.log('ℹ️ businessLat column already exists.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

fixBusinessLat();
