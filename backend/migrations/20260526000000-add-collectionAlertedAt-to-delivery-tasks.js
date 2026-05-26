const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  console.log('🔄 Adding collectionAlertedAt to DeliveryTask table...');
  const tableInfo = await queryInterface.describeTable('DeliveryTask');
  if (!tableInfo.collectionAlertedAt) {
    await queryInterface.addColumn('DeliveryTask', 'collectionAlertedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the customer was notified that the order is ready for collection'
    });
    console.log('✅ collectionAlertedAt column added to DeliveryTask');
  } else {
    console.log('✅ collectionAlertedAt already exists in DeliveryTask');
  }
}

async function down(queryInterface) {
  const tableInfo = await queryInterface.describeTable('DeliveryTask');
  if (tableInfo.collectionAlertedAt) {
    await queryInterface.removeColumn('DeliveryTask', 'collectionAlertedAt');
  }
}

module.exports = { up, down };
