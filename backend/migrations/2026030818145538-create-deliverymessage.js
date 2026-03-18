'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeliveryMessage', {
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
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
          comment: 'Associated order'
        },
        senderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
          comment: 'User ID of the sender'
        },
        receiverId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
          comment: 'User ID of the receiver'
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        isRead: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'text'
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
    // await queryInterface.addIndex('DeliveryMessage', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DeliveryMessage');
  }
};
