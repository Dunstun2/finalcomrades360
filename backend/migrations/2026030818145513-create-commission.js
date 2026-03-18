'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Commission', {
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
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Order',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Product',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        fastFoodId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'FastFoods',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        serviceId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Services',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        saleAmount: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        commissionRate: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        commissionAmount: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
          defaultValue: 'pending'
        },
        referralCode: {
          type: Sequelize.STRING,
          allowNull: false
        },
        commissionType: {
          type: Sequelize.ENUM('full_100', 'primary_60', 'secondary_40'),
          defaultValue: 'full_100'
        },
        paidAt: {
          type: Sequelize.DATE
        },
        pricingMethod: {
          type: Sequelize.STRING
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
    // await queryInterface.addIndex('Commission', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Commission');
  }
};
