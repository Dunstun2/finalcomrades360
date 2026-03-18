'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LoginHistory', {
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
        ipAddress: {
          type: Sequelize.STRING
        },
        browser: {
          type: Sequelize.STRING
        },
        device: {
          type: Sequelize.STRING
        },
        os: {
          type: Sequelize.STRING
        },
        location: {
          type: Sequelize.STRING
        },
        status: {
          type: Sequelize.ENUM('success', 'failed'),
          defaultValue: 'success'
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
    // await queryInterface.addIndex('LoginHistory', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('LoginHistory');
  }
};
