// Migration to add deletionReason column to FastFoods
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('FastFoods')) return;
    const definition = await queryInterface.describeTable('FastFoods');
    if (!definition.deletionReason) {
      await queryInterface.addColumn('FastFoods', 'deletionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional reason for soft deletion of fast food item'
      });
    }
  },
  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('FastFoods')) return;
    const definition = await queryInterface.describeTable('FastFoods');
    if (definition.deletionReason) {
      await queryInterface.removeColumn('FastFoods', 'deletionReason');
    }
  }
};
