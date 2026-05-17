const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  console.log('🔄 Adding warningSentAt to DeliveryTask table...');
  const tableInfo = await queryInterface.describeTable('DeliveryTask');
  if (!tableInfo.warningSentAt) {
    await queryInterface.addColumn('DeliveryTask', 'warningSentAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the collection-delay warning was sent to the agent — prevents duplicate warnings'
    });
    console.log('✅ warningSentAt column added to DeliveryTask');
  } else {
    console.log('✅ warningSentAt already exists in DeliveryTask');
  }
}

async function down(queryInterface) {
  const tableInfo = await queryInterface.describeTable('DeliveryTask');
  if (tableInfo.warningSentAt) {
    await queryInterface.removeColumn('DeliveryTask', 'warningSentAt');
  }
}

module.exports = { up, down };
