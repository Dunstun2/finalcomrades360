'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add payment verification fields to Orders table
      await queryInterface.addColumn('Order', 'needsPaymentVerification', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this order requires manual payment verification'
      }, { transaction });

      await queryInterface.addColumn('Order', 'paymentVerificationStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: true,
        comment: 'Status of payment verification'
      }, { transaction });

      await queryInterface.addColumn('Order', 'paymentVerifiedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When payment was verified by admin'
      }, { transaction });

      await queryInterface.addColumn('Order', 'paymentVerifiedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User ID of admin who verified payment'
      }, { transaction });

      await queryInterface.addColumn('Order', 'paymentRejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for payment rejection'
      }, { transaction });

      await queryInterface.addColumn('Order', 'guestData', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Guest user information (name, email, phone) for subscription orders'
      }, { transaction });

      await queryInterface.addColumn('Order', 'subscriptionId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Associated subscription ID for subscription orders'
      }, { transaction });

      // Add subscription lifecycle fields to Subscription table
      await queryInterface.addColumn('Subscription', 'activatedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When subscription was activated after payment verification'
      }, { transaction });

      await queryInterface.addColumn('Subscription', 'cancelledAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When subscription was cancelled'
      }, { transaction });

      await queryInterface.addColumn('Subscription', 'cancellationReason', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for subscription cancellation'
      }, { transaction });

      await transaction.commit();
      console.log('✅ Payment verification fields added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove fields from Orders table
      await queryInterface.removeColumn('Order', 'needsPaymentVerification', { transaction });
      await queryInterface.removeColumn('Order', 'paymentVerificationStatus', { transaction });
      await queryInterface.removeColumn('Order', 'paymentVerifiedAt', { transaction });
      await queryInterface.removeColumn('Order', 'paymentVerifiedBy', { transaction });
      await queryInterface.removeColumn('Order', 'paymentRejectionReason', { transaction });
      await queryInterface.removeColumn('Order', 'guestData', { transaction });
      await queryInterface.removeColumn('Order', 'subscriptionId', { transaction });

      // Remove fields from Subscription table
      await queryInterface.removeColumn('Subscription', 'activatedAt', { transaction });
      await queryInterface.removeColumn('Subscription', 'cancelledAt', { transaction });
      await queryInterface.removeColumn('Subscription', 'cancellationReason', { transaction });

      await transaction.commit();
      console.log('✅ Payment verification fields removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};