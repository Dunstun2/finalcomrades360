const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  console.log('🔄 Adding isActive to Batches table...');
  const tableInfo = await queryInterface.describeTable('Batches');
  if (!tableInfo.isActive) {
    await queryInterface.addColumn('Batches', 'isActive', {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this batch is visible on the customer side'
    });
    console.log('✅ isActive column added to Batches');
  } else {
    console.log('✅ isActive already exists in Batches');
  }
}

async function down(queryInterface) {
  const tableInfo = await queryInterface.describeTable('Batches');
  if (tableInfo.isActive) {
    await queryInterface.removeColumn('Batches', 'isActive');
  }
}

module.exports = { up, down };
