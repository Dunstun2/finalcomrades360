'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeliveryAgentProfile', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        location: {
          type: Sequelize.STRING,
          comment: 'Primary working location/area'
        },
        availability: {
          type: Sequelize.TEXT,
          comment: 'Work schedule as JSON'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Whether agent is currently active'
        },
        vehicleType: {
          type: Sequelize.STRING,
          comment: 'Type of vehicle (Walking, Bicycle, Motorcycle, etc.)'
        },
        vehiclePlate: {
          type: Sequelize.STRING,
          comment: 'Vehicle registration/plate number'
        },
        maxLoadCapacity: {
          type: Sequelize.FLOAT,
          comment: 'Maximum load capacity in kg'
        },
        currentLocation: {
          type: Sequelize.TEXT,
          comment: 'Current GPS location as JSON {lat, lng, timestamp}'
        },
        rating: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Average rating (0-5)'
        },
        completedDeliveries: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Total number of completed deliveries'
        },
        totalEarnings: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Total earnings from deliveries'
        },
        licenseNumber: {
          type: Sequelize.STRING,
          comment: 'Driver license number'
        },
        emergencyContact: {
          type: Sequelize.STRING,
          comment: 'Emergency contact phone number'
        },
        profilePhoto: {
          type: Sequelize.STRING,
          comment: 'URL to profile photo'
        },
        idDocument: {
          type: Sequelize.STRING,
          comment: 'URL to ID/License document'
        },
        backgroundCheckStatus: {
          type: Sequelize.STRING,
          defaultValue: 'pending'
        },
        vehicleModel: {
          type: Sequelize.STRING
        },
        vehicleColor: {
          type: Sequelize.STRING
        },
        vehiclePhoto: {
          type: Sequelize.STRING,
          comment: 'URL to vehicle photo'
        },
        insuranceDocument: {
          type: Sequelize.STRING,
          comment: 'URL to insurance document'
        },
        insuranceExpiry: {
          type: Sequelize.DATE
        },
        inspectionCertificate: {
          type: Sequelize.STRING,
          comment: 'URL to inspection certificate'
        },
        bankName: {
          type: Sequelize.STRING
        },
        accountNumber: {
          type: Sequelize.STRING
        },
        accountName: {
          type: Sequelize.STRING
        },
        mobileMoneyNumber: {
          type: Sequelize.STRING
        },
        mobileMoneyProvider: {
          type: Sequelize.STRING
        },
        paymentMethod: {
          type: Sequelize.STRING,
          defaultValue: 'mobile_money'
        },
        acceptanceRate: {
          type: Sequelize.FLOAT,
          defaultValue: 100
        },
        completionRate: {
          type: Sequelize.FLOAT,
          defaultValue: 100
        },
        onTimeRate: {
          type: Sequelize.FLOAT,
          defaultValue: 100
        },
        preferredZones: {
          type: Sequelize.TEXT,
          comment: 'Array of strings stored as JSON'
        },
        maxDeliveryDistance: {
          type: Sequelize.FLOAT,
          defaultValue: 10
        },
        notificationSettings: {
          type: Sequelize.TEXT,
          defaultValue: '{"newOrder":true,"statusUpdate":true,"promotional":false}',
          comment: 'Notification preferences stored as JSON'
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
    // await queryInterface.addIndex('DeliveryAgentProfile', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DeliveryAgentProfile');
  }
};
