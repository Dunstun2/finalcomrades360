'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Refunds', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        paymentId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Payments',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Orders',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Refund amount (may be partial)'
        },
        originalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Original payment amount'
        },
        refundType: {
          type: Sequelize.ENUM('full', 'partial'),
          defaultValue: 'full'
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Reason for refund request'
        },
        status: {
          type: Sequelize.ENUM('requested', 'approved', 'processing', 'completed', 'rejected', 'failed'),
          defaultValue: 'requested'
        },
        method: {
          type: Sequelize.ENUM('original_payment_method', 'wallet_credit', 'manual_transfer'),
          defaultValue: 'original_payment_method'
        },
        externalRefundId: {
          type: Sequelize.STRING,
          comment: 'M-Pesa or payment gateway refund ID'
        },
        requestedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
          comment: 'User who requested the refund (customer or admin)'
        },
        approvedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        processedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        approvedAt: {
          type: Sequelize.DATE
        },
        completedAt: {
          type: Sequelize.DATE
        },
        rejectionReason: {
          type: Sequelize.TEXT
        },
        metadata: {
          type: Sequelize.JSON
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
    // await queryInterface.addIndex('Refunds', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Refunds');
  }
};
