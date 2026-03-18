'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Cart', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
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
            model: 'FastFood',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        serviceId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Service',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        itemType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'product'
        },
        variantId: {
          type: Sequelize.STRING,
          comment: 'Identifier for size variant (e.g. "Large")'
        },
        comboId: {
          type: Sequelize.STRING,
          comment: 'Identifier for combo option'
        },
        cartType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'personal',
          comment: 'Type of cart: personal or marketing'
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        price: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        total: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        deliveryFee: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Delivery fee for this item'
        },
        itemCommission: {
          type: Sequelize.FLOAT,
          defaultValue: 0,
          comment: 'Marketing commission for this item (quantity * unit commission)'
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
    // await queryInterface.addIndex('Cart', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Cart');
  }
};
