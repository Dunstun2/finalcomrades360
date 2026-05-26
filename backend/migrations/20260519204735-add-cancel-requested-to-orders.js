'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('Orders') ? 'Orders' : tables.includes('Order') ? 'Order' : null;

    if (!targetTable) {
      console.warn('No Order table found, skipping cancelRequested migration.');
      return;
    }

    const tableDefinition = await queryInterface.describeTable(targetTable);
    if (tableDefinition.cancelRequested) {
      console.log('cancelRequested column already exists, skipping addColumn.');
      return;
    }

    await queryInterface.addColumn(targetTable, 'cancelRequested', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('Orders') ? 'Orders' : tables.includes('Order') ? 'Order' : null;

    if (!targetTable) {
      console.warn('No Order table found, skipping removeColumn.');
      return;
    }

    const tableDefinition = await queryInterface.describeTable(targetTable);
    if (!tableDefinition.cancelRequested) {
      console.log('cancelRequested column does not exist, skipping removeColumn.');
      return;
    }

    await queryInterface.removeColumn(targetTable, 'cancelRequested');
  }
};
