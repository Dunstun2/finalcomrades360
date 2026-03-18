'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PaymentReconciliations', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        paymentId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Payments',
            key: 'id'
          }
        },
        orderId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Orders',
            key: 'id'
          }
        },
        transactionId: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'External transaction ID (e.g., M-Pesa receipt)'
        },
        expectedAmount: {
          type: Sequelize.DECIMAL(10, 2),
          comment: 'Expected payment amount'
        },
        actualAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Actual amount received'
        },
        discrepancyType: {
          type: Sequelize.ENUM('overpayment', 'underpayment', 'orphaned_payment', 'duplicate', 'reversed', 'mismatch', 'resolved'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'investigating', 'resolved', 'escalated'),
          defaultValue: 'pending'
        },
        notes: {
          type: Sequelize.TEXT
        },
        resolvedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        resolvedAt: {
          type: Sequelize.DATE
        },
        resolutionAction: {
          type: Sequelize.ENUM('refund_issued', 'partial_refund', 'credit_wallet', 'manual_adjustment', 'accepted_as_is')
        },
        metadata: {
          type: Sequelize.JSON,
          comment: 'Additional investigation data'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Add indexes if needed
    // await queryInterface.addIndex('PaymentReconciliations', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PaymentReconciliations');
  }
};
