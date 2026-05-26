'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasSingular = tables.includes('HeroPromotion');
    const hasPlural = tables.includes('HeroPromotions');

    if (hasSingular && !hasPlural) {
      await queryInterface.renameTable('HeroPromotion', 'HeroPromotions');
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasSingular = tables.includes('HeroPromotion');
    const hasPlural = tables.includes('HeroPromotions');

    if (hasPlural && !hasSingular) {
      await queryInterface.renameTable('HeroPromotions', 'HeroPromotion');
    }
  }
};
