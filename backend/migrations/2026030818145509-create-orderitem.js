'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OrderItem', {
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
          onUpdate: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Product',
            key: 'id'
          },
          onDelete: 'SET NULL',
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
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        price: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        variantId: {
          type: Sequelize.STRING,
          comment: 'Identifier for size variant (e.g. "Large")'
        },
        comboId: {
          type: Sequelize.STRING,
          comment: 'Identifier for combo option'
        },
        itemLabel: {
          type: Sequelize.STRING,
          comment: 'Human-readable label with variant/combo (e.g. "Burger - Large")'
        },
        total: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'price * quantity'
        },
        basePrice: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'original base price from seller'
        },
        commissionAmount: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'marketing commission for this item'
        },
        deliveryFee: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'item-specific delivery fee'
        },
        itemType: {
          type: Sequelize.ENUM('product', 'fastfood', 'service'),
          defaultValue: 'product'
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
    // await queryInterface.addIndex('OrderItem', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OrderItem');
  }
};
