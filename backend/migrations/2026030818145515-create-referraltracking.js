'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ReferralTracking')) return;

    await queryInterface.createTable('ReferralTracking', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        referrerId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        referredUserId: {
          type: Sequelize.INTEGER
        },
        productId: {
          type: Sequelize.INTEGER
        },
        fastFoodId: {
          type: Sequelize.INTEGER
        },
        serviceId: {
          type: Sequelize.INTEGER
        },
        orderId: {
          type: Sequelize.INTEGER
        },
        referralCode: {
          type: Sequelize.STRING,
          allowNull: false
        },
        clickedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        convertedAt: {
          type: Sequelize.DATE
        },
        ipAddress: {
          type: Sequelize.STRING
        },
        userAgent: {
          type: Sequelize.TEXT
        },
        socialPlatform: {
          type: Sequelize.STRING
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
    // await queryInterface.addIndex('ReferralTracking', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReferralTracking');
  }
};
