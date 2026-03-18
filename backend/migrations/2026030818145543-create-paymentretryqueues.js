'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PaymentRetryQueues', {
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
        retryCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Number of retry attempts made'
        },
        maxRetries: {
          type: Sequelize.INTEGER,
          defaultValue: 3,
          comment: 'Maximum retry attempts allowed'
        },
        nextRetryAt: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Next scheduled retry timestamp'
        },
        status: {
          type: Sequelize.ENUM('pending', 'retrying', 'completed', 'exhausted', 'cancelled'),
          defaultValue: 'pending'
        },
        failureReason: {
          type: Sequelize.TEXT,
          comment: 'Reason for payment failure'
        },
        lastAttemptAt: {
          type: Sequelize.DATE
        },
        lastAttemptError: {
          type: Sequelize.TEXT
        },
        metadata: {
          type: Sequelize.JSON,
          comment: 'Original payment request data for retry'
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
    // await queryInterface.addIndex('PaymentRetryQueues', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PaymentRetryQueues');
  }
};
