const { QueryInterface, DataTypes } = require('sequelize');
const { sequelize } = require('../models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const tableDefinition = await queryInterface.describeTable('User');

  if (!tableDefinition.mustChangePassword) {
    console.log('Adding mustChangePassword column to User table...');
    await queryInterface.addColumn('User', 'mustChangePassword', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    console.log('Column added successfully.');
  } else {
    console.log('mustChangePassword column already exists.');
  }
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
