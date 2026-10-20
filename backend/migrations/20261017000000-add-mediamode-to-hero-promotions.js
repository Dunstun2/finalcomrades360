'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const targetTable = 'HeroPromotions';
    const tableDesc = await queryInterface.describeTable(targetTable);

    if (tableDesc.mediaMode) {
      console.log('mediaMode column already exists, skipping addColumn.');
      return;
    }

    await queryInterface.addColumn(targetTable, 'mediaMode', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'image'
    });

    console.log('Added mediaMode column to HeroPromotions table.');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('HeroPromotions', 'mediaMode');
  }
};
