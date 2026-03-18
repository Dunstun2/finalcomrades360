'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StockReservations', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Products',
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
          onUpdate: 'CASCADE'
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Reserved quantity'
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Warehouses',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Specific warehouse allocation'
        },
        sessionId: {
          type: Sequelize.STRING,
          comment: 'Checkout session identifier for bulk release'
        },
        orderId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Orders',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Null until order created, then fulfilled'
        },
        status: {
          type: Sequelize.ENUM('active', 'fulfilled', 'cancelled', 'expired'),
          defaultValue: 'active',
          comment: 'Lifecycle state of reservation'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: () => new Date(Date.now() + 15 * 60 * 1000),
          comment: 'Auto-release if expired'
        },
        releasedAt: {
          type: Sequelize.DATE,
          comment: 'Timestamp when released (fulfilled/cancelled/expired)'
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
    // await queryInterface.addIndex('StockReservations', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('StockReservations');
  }
};
