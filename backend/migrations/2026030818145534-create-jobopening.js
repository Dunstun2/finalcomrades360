'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JobOpening', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        role: {
          type: Sequelize.ENUM('seller', 'marketer', 'delivery_agent', 'service_provider'),
          allowNull: false
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        requirements: {
          type: Sequelize.TEXT
        },
        targetCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        status: {
          type: Sequelize.ENUM('active', 'closed', 'filled'),
          defaultValue: 'active'
        },
        deadline: {
          type: Sequelize.DATE
        },
        createdBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        deletedAt: {
          type: Sequelize.DATE
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
    // await queryInterface.addIndex('JobOpening', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('JobOpening');
  }
};
