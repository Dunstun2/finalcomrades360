'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create promo_codes table
    await queryInterface.createTable('promo_codes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      discountPercentage: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add promo columns to Orders table
    await queryInterface.addColumn('Order', 'promoCode', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Promo code applied to the order'
    });
    
    await queryInterface.addColumn('Order', 'discountAmount', {
      type: Sequelize.FLOAT,
      defaultValue: 0,
      comment: 'Amount discounted via promo code'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Order', 'discountAmount');
    await queryInterface.removeColumn('Order', 'promoCode');
    await queryInterface.dropTable('promo_codes');
  }
};
