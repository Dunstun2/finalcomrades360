'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Wallet', {
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
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        balance: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        pendingBalance: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        successBalance: {
          type: Sequelize.FLOAT,
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
    // await queryInterface.addIndex('Wallet', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Wallet');
  }
};
