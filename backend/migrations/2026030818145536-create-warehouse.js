'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Warehouse', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Warehouse name (e.g., Main Warehouse, Nairobi Central)'
        },
        code: {
          type: Sequelize.STRING(20),
          unique: true,
          comment: 'Unique warehouse code for identification'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Full physical address'
        },
        county: {
          type: Sequelize.STRING,
          comment: 'County location'
        },
        town: {
          type: Sequelize.STRING,
          comment: 'Town/City'
        },
        landmark: {
          type: Sequelize.STRING,
          comment: 'Nearby landmark for easier location'
        },
        contactPerson: {
          type: Sequelize.STRING,
          comment: 'Warehouse manager or contact person name'
        },
        contactPhone: {
          type: Sequelize.STRING,
          comment: 'Contact phone number'
        },
        contactEmail: {
          type: Sequelize.STRING,
          comment: 'Contact email address'
        },
        capacity: {
          type: Sequelize.INTEGER,
          comment: 'Storage capacity in cubic meters or items'
        },
        operatingHours: {
          type: Sequelize.STRING,
          comment: 'Operating hours (e.g., Mon-Fri 8AM-5PM)'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Whether warehouse is currently active/operational'
        },
        notes: {
          type: Sequelize.TEXT,
          comment: 'Additional notes or instructions'
        },
        lat: {
          type: Sequelize.DECIMAL(10, 8),
          comment: 'Latitude of the warehouse'
        },
        lng: {
          type: Sequelize.DECIMAL(11, 8),
          comment: 'Longitude of the warehouse'
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
    // await queryInterface.addIndex('Warehouse', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Warehouse');
  }
};
