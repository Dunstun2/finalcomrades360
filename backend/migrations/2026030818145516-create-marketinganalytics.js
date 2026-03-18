'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('MarketingAnalytics')) return;

    await queryInterface.createTable('MarketingAnalytics', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        marketerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Product',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        platform: {
          type: Sequelize.STRING,
          allowNull: false
        },
        actionType: {
          type: Sequelize.STRING,
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        ipAddress: {
          type: Sequelize.STRING
        },
        userAgent: {
          type: Sequelize.TEXT
        },
        sessionId: {
          type: Sequelize.STRING
        },
        conversionValue: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        commissionEarned: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        deviceType: {
          type: Sequelize.STRING
        },
        location: {
          type: Sequelize.STRING
        },
        referralCode: {
          type: Sequelize.STRING
        },
        shareUrl: {
          type: Sequelize.TEXT
        },
        metadata: {
          type: Sequelize.JSON,
          defaultValue: {}
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
    // await queryInterface.addIndex('MarketingAnalytics', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MarketingAnalytics');
  }
};
