'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('promo_codes', 'minUserOrderCount', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    } catch (error) {
      console.log('Column minUserOrderCount may already exist:', error.message);
    }
    
    try {
      await queryInterface.addColumn('promo_codes', 'minUserLifetimeSpend', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    } catch (error) {
      console.log('Column minUserLifetimeSpend may already exist:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('promo_codes', 'minUserOrderCount');
    } catch (error) {}
    
    try {
      await queryInterface.removeColumn('promo_codes', 'minUserLifetimeSpend');
    } catch (error) {}
  }
};
