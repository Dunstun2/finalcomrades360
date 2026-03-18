'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StockAuditLogs', {
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
        warehouseId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Warehouses',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        changeType: {
          type: Sequelize.ENUM('sale', 'restock', 'adjustment', 'return', 'damage', 'transfer', 'reservation', 'reservation_release', 'bulk_import', 'initial'),
          allowNull: false
        },
        quantityBefore: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Stock level before change'
        },
        quantityChange: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Positive for increase, negative for decrease'
        },
        quantityAfter: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Stock level after change'
        },
        orderId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Orders',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Related order if applicable'
        },
        userId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'User who triggered the change'
        },
        reason: {
          type: Sequelize.TEXT,
          comment: 'Explanation for manual adjustments'
        },
        metadata: {
          type: Sequelize.JSON,
          comment: 'Additional context (transfer details, bulk import summary, etc.)'
        },
        createdAt: {
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
    // await queryInterface.addIndex('StockAuditLogs', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('StockAuditLogs');
  }
};
