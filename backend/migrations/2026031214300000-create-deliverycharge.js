'use strict';

async function hasTable(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === 'string') return table === tableName;
    return (table.tableName || table.name) === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface, 'DeliveryCharge')) return;

    await queryInterface.createTable('DeliveryCharge', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Order', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deliveryTaskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'DeliveryTask', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      routeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payerType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'platform'
      },
      payerUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      payeeUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      grossAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      chargedAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      outstandingAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      agentSharePercent: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      agentAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      platformAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      sellerMerchandisePayout: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      fundingSource: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'unknown'
      },
      fundingStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'quoted'
      },
      quotedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      invoicedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      chargedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      settledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('DeliveryCharge', ['orderId']);
    await queryInterface.addIndex('DeliveryCharge', ['payerType']);
    await queryInterface.addIndex('DeliveryCharge', ['fundingStatus']);
    await queryInterface.addIndex('DeliveryCharge', ['routeType']);
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, 'DeliveryCharge'))) return;
    await queryInterface.dropTable('DeliveryCharge');
  }
};