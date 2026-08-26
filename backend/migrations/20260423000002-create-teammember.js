'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TeamMember', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Team member full name'
      },
      position: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Team member job position/title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Team member bio or description'
      },
      photo: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Team member photo URL or base64'
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Display order of team members'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to display this team member'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Admin user who created this team member'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Admin user who last updated this team member'
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

    // Add indexes
    await queryInterface.addIndex('TeamMember', ['isActive']);
    await queryInterface.addIndex('TeamMember', ['order']);
    await queryInterface.addIndex('TeamMember', ['createdBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TeamMember');
  }
};
