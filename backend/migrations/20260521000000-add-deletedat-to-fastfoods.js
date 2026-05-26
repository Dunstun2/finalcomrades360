'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableNames = await queryInterface.showAllTables();
    if (!tableNames.includes('FastFoods')) return;

    const tableDefinition = await queryInterface.describeTable('FastFoods');
    if (!tableDefinition.deletedAt) {
      await queryInterface.addColumn('FastFoods', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the fast food item was soft deleted'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableNames = await queryInterface.showAllTables();
    if (!tableNames.includes('FastFoods')) return;

    const tableDefinition = await queryInterface.describeTable('FastFoods');
    if (tableDefinition.deletedAt) {
      await queryInterface.removeColumn('FastFoods', 'deletedAt');
    }
  }
};
