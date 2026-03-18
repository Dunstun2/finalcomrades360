'use strict';

/** @type {import('sequelize-cli').Migration} */

async function findOrdersTable(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((table) => {
    if (typeof table === 'string') return table;
    return table.tableName || table.name || '';
  });

  const match = tableNames.find((name) => ['Order', 'Orders'].includes(name));
  return match || null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = await findOrdersTable(queryInterface);
    if (!tableName) return;

    const table = await queryInterface.describeTable(tableName);

    if (!table.destinationFastFoodPickupPointId) {
      await queryInterface.addColumn(tableName, 'destinationFastFoodPickupPointId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'FastFoodPickupPoint',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`adminRoutingStrategy\` ENUM('warehouse','pick_station','direct_delivery','fastfood_pickup_point') NULL`
      );
    }
  },

  async down(queryInterface) {
    const tableName = await findOrdersTable(queryInterface);
    if (!tableName) return;

    const table = await queryInterface.describeTable(tableName);
    if (table.destinationFastFoodPickupPointId) {
      await queryInterface.removeColumn(tableName, 'destinationFastFoodPickupPointId');
    }

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`adminRoutingStrategy\` ENUM('warehouse','pick_station','direct_delivery') NULL`
      );
    }
  },
};
