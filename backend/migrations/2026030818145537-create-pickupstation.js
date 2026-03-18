'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PickupStation', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        location: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        contactPhone: {
          type: Sequelize.STRING
        },
        operatingHours: {
          type: Sequelize.STRING
        },
        price: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Delivery fee to this station'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT
        },
        lat: {
          type: Sequelize.DECIMAL(10, 8),
          comment: 'Latitude of the pickup station'
        },
        lng: {
          type: Sequelize.DECIMAL(11, 8),
          comment: 'Longitude of the pickup station'
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
    // await queryInterface.addIndex('PickupStation', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PickupStation');
  }
};
