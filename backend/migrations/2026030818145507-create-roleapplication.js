'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('RoleApplication')) return;

    await queryInterface.createTable('RoleApplication', {
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
        appliedRole: {
          type: Sequelize.ENUM('seller', 'marketer', 'delivery_agent', 'service_provider'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
          defaultValue: 'draft'
        },
        reason: {
          type: Sequelize.TEXT
        },
        university: {
          type: Sequelize.STRING
        },
        studentId: {
          type: Sequelize.STRING
        },
        nationalIdFrontUrl: {
          type: Sequelize.STRING
        },
        nationalIdBackUrl: {
          type: Sequelize.STRING
        },
        studentIdFrontUrl: {
          type: Sequelize.STRING
        },
        studentIdBackUrl: {
          type: Sequelize.STRING
        },
        referees: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        ipAddress: {
          type: Sequelize.STRING
        },
        userAgent: {
          type: Sequelize.TEXT
        },
        reviewedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        adminNotes: {
          type: Sequelize.TEXT
        },
        reviewedAt: {
          type: Sequelize.DATE
        },
        deletedAt: {
          type: Sequelize.DATE
        },
        jobOpeningId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'JobOpening',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
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
    // await queryInterface.addIndex('RoleApplication', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RoleApplication');
  }
};
