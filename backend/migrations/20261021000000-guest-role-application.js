'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('RoleApplication');

    // Make userId nullable (allow guest applications)
    if (tableDesc.userId) {
      await queryInterface.changeColumn('RoleApplication', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    // Add guest fields if they don't exist
    if (!tableDesc.guestName) {
      await queryInterface.addColumn('RoleApplication', 'guestName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableDesc.guestEmail) {
      await queryInterface.addColumn('RoleApplication', 'guestEmail', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableDesc.guestPhone) {
      await queryInterface.addColumn('RoleApplication', 'guestPhone', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('RoleApplication');

    if (tableDesc.guestName) {
      await queryInterface.removeColumn('RoleApplication', 'guestName');
    }
    if (tableDesc.guestEmail) {
      await queryInterface.removeColumn('RoleApplication', 'guestEmail');
    }
    if (tableDesc.guestPhone) {
      await queryInterface.removeColumn('RoleApplication', 'guestPhone');
    }

    // Revert userId to non-nullable
    await queryInterface.changeColumn('RoleApplication', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
