'use strict';

/** @type {import('sequelize-cli').Migration} */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.name || ''))
    .map((table) => String(table).toLowerCase());

  return normalized.includes(tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'FastFoodPickupPoint';

    if (!(await tableExists(queryInterface, tableName))) {
      return;
    }

    const table = await queryInterface.describeTable(tableName);
    if (!table.deliveryFee) {
      await queryInterface.addColumn(tableName, 'deliveryFee', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const tableName = 'FastFoodPickupPoint';

    if (!(await tableExists(queryInterface, tableName))) {
      return;
    }

    const table = await queryInterface.describeTable(tableName);
    if (table.deliveryFee) {
      await queryInterface.removeColumn(tableName, 'deliveryFee');
    }
  },
};
