'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('Roles')) return;

    await queryInterface.createTable('Roles', {
id: {
          type: Sequelize.STRING,
          primaryKey: true,
          allowNull: false,
          comment: 'Role slug (e.g., manager, premium_seller)'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT
        },
        accessLevels: {
          type: Sequelize.JSON,
          defaultValue: {},
          comment: 'Section-based access control'
        },
        permissions: {
          type: Sequelize.JSON,
          defaultValue: [],
          comment: 'Array of specific permission strings'
        },
        isSystem: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'If true, role cannot be deleted'
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
    // await queryInterface.addIndex('Roles', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Roles');
  }
};
