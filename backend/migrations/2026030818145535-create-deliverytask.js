'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeliveryTask', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Order',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          comment: 'Reference to the order being delivered'
        },
        deliveryAgentId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Delivery agent assigned to this task'
        },
        deliveryType: {
          type: Sequelize.STRING,
          comment: 'Type of delivery route'
        },
        pickupLocation: {
          type: Sequelize.TEXT,
          comment: 'Address/location for pickup (warehouse, customer, or seller address)'
        },
        deliveryLocation: {
          type: Sequelize.TEXT,
          comment: 'Address/location for delivery'
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'assigned',
          comment: 'Current status of the delivery task'
        },
        assignedAt: {
          type: Sequelize.DATE,
          comment: 'When the task was assigned to an agent'
        },
        acceptedAt: {
          type: Sequelize.DATE,
          comment: 'When the agent accepted the task'
        },
        arrivedAt: {
          type: Sequelize.DATE,
          comment: 'When the agent arrived at the pickup location'
        },
        collectedAt: {
          type: Sequelize.DATE,
          comment: 'When the agent confirmed collection at pickup location'
        },
        startedAt: {
          type: Sequelize.DATE,
          comment: 'When the agent started the delivery'
        },
        completedAt: {
          type: Sequelize.DATE,
          comment: 'When the delivery was completed'
        },
        estimatedDeliveryTime: {
          type: Sequelize.DATE,
          comment: 'Estimated delivery completion time'
        },
        notes: {
          type: Sequelize.TEXT,
          comment: 'Additional notes or instructions for the delivery'
        },
        agentNotes: {
          type: Sequelize.TEXT,
          comment: 'Notes added by the delivery agent during/after delivery'
        },
        failureReason: {
          type: Sequelize.TEXT,
          comment: 'Reason for failed delivery'
        },
        rejectionReason: {
          type: Sequelize.TEXT,
          comment: 'Reason for task rejection by agent'
        },
        proofOfDelivery: {
          type: Sequelize.TEXT,
          comment: 'URL to proof of delivery image/signature'
        },
        currentLocation: {
          type: Sequelize.TEXT,
          comment: 'Last known location during delivery (JSON: {lat, lng, timestamp})'
        },
        distanceKm: {
          type: Sequelize.FLOAT,
          comment: 'Calculated distance in kilometers'
        },
        deliveryFee: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Delivery fee for this task'
        },
        agentEarnings: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Agent earnings from this delivery'
        },
        agentShare: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Locked agent share percentage at the time of assignment'
        },
        systemRevenueClaimed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether the platform system revenue share has been collected'
        },
        systemRevenueClaimedAt: {
          type: Sequelize.DATE,
          comment: 'When the system revenue was collected'
        },
        systemRevenueAmount: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'The platform system share amount collected from this task'
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
    // await queryInterface.addIndex('DeliveryTask', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DeliveryTask');
  }
};
