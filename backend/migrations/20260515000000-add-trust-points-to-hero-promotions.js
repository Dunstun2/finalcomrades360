'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HeroPromotions', 'trustPoints', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('HeroPromotions', 'trustPoints');
  }
};
