'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AboutPage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      brandStory: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Company brand story'
      },
      vision: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Company vision'
      },
      mission: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Company mission'
      },
      values: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Company core values'
      },
      additionalInfo: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional company information'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Admin user who created this content'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Admin user who last updated this content'
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
    await queryInterface.addIndex('AboutPage', ['createdBy']);
    await queryInterface.addIndex('AboutPage', ['updatedBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AboutPage');
  }
};
