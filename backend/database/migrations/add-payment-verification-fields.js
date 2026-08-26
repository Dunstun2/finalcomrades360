'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add payment verification fields to Orders table
    await queryInterface.addColumn('Orders', 'needsPaymentVerification', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    await queryInterface.addColumn('Orders', 'paymentVerificationStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('Orders', 'paymentVerifiedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Orders', 'paymentVerifiedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('Orders', 'paymentRejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add activation fields to Subscriptions table
    await queryInterface.addColumn('Subscriptions', 'activatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove payment verification fields from Orders table
    await queryInterface.removeColumn('Orders', 'needsPaymentVerification');
    await queryInterface.removeColumn('Orders', 'paymentVerificationStatus');
    await queryInterface.removeColumn('Orders', 'paymentVerifiedAt');
    await queryInterface.removeColumn('Orders', 'paymentVerifiedBy');
    await queryInterface.removeColumn('Orders', 'paymentRejectionReason');

    // Remove activation fields from Subscriptions table
    await queryInterface.removeColumn('Subscriptions', 'activatedAt');
  }
};