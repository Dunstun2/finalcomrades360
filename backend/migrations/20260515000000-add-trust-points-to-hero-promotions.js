'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('HeroPromotions') ? 'HeroPromotions' : tables.includes('HeroPromotion') ? 'HeroPromotion' : null;

    if (!targetTable) {
      console.warn('No HeroPromotion table found, skipping trustPoints migration.');
      return;
    }

    const tableDefinition = await queryInterface.describeTable(targetTable);
    if (tableDefinition.trustPoints) {
      console.log('trustPoints column already exists, skipping addColumn.');
      return;
    }

    await queryInterface.addColumn(targetTable, 'trustPoints', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('HeroPromotions') ? 'HeroPromotions' : tables.includes('HeroPromotion') ? 'HeroPromotion' : null;

    if (!targetTable) {
      console.warn('No HeroPromotion table found, skipping removeColumn.');
      return;
    }

    const tableDefinition = await queryInterface.describeTable(targetTable);
    if (!tableDefinition.trustPoints) {
      console.log('trustPoints column does not exist, skipping removeColumn.');
      return;
    }

    await queryInterface.removeColumn(targetTable, 'trustPoints');
  }
};
