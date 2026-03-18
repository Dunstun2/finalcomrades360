'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PaymentDisputes', {
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
          onUpdate: 'CASCADE',
          comment: 'Customer who raised the dispute'
        },
        disputeType: {
          type: Sequelize.ENUM('unauthorized_charge', 'double_charge', 'wrong_amount', 'service_not_received', 'product_not_received', 'defective_product', 'other'),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Detailed dispute description from customer'
        },
        status: {
          type: Sequelize.ENUM('open', 'investigating', 'awaiting_customer', 'awaiting_seller', 'resolved', 'closed'),
          defaultValue: 'open'
        },
        priority: {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          defaultValue: 'medium'
        },
        assignedTo: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Admin assigned to handle the dispute'
        },
        resolution: {
          type: Sequelize.ENUM('refund', 'partial_refund', 'replacement', 'credit', 'no_action', 'escalated')
        },
        resolutionNotes: {
          type: Sequelize.TEXT
        },
        resolvedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        resolvedAt: {
          type: Sequelize.DATE
        },
        evidence: {
          type: Sequelize.JSON,
          comment: 'Attached documents/screenshots URLs'
        },
        timeline: {
          type: Sequelize.JSON,
          comment: 'Dispute activity timeline'
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
    // await queryInterface.addIndex('PaymentDisputes', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PaymentDisputes');
  }
};
