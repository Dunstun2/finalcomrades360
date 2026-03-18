'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HeroPromotion', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        sellerId: {
          type: Sequelize.INTEGER
        },
        productIds: {
          type: Sequelize.TEXT
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending_payment'
        },
        paymentStatus: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'unpaid'
        },
        amount: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 0
        },
        durationDays: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 7
        },
        slotsCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        startAt: {
          type: Sequelize.DATE
        },
        endAt: {
          type: Sequelize.DATE
        },
        approvedBy: {
          type: Sequelize.INTEGER
        },
        notes: {
          type: Sequelize.TEXT
        },
        paymentProofUrl: {
          type: Sequelize.TEXT
        },
        title: {
          type: Sequelize.STRING
        },
        subtitle: {
          type: Sequelize.STRING
        },
        customImageUrl: {
          type: Sequelize.TEXT
        },
        targetUrl: {
          type: Sequelize.TEXT
        },
        isSystem: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isDefault: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        priority: {
          type: Sequelize.INTEGER,
          defaultValue: 0
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
    // await queryInterface.addIndex('HeroPromotion', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('HeroPromotion');
  }
};
