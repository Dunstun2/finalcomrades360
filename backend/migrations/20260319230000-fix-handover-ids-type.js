'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Remove foreign key constraints first (if they exist)
    // Note: SQLite doesn't easily support dropping constraints without recreating the table,
    // but in many dialects, we need to do this. For SQLite, queryInterface.changeColumn
    // often handles the underlying table recreation if needed.

    // 2. Change initiatorId from INTEGER to STRING
    await queryInterface.changeColumn('HandoverCode', 'initiatorId', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // 3. Change confirmerId from INTEGER to STRING
    await queryInterface.changeColumn('HandoverCode', 'confirmerId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    console.log('[Migration] HandoverCode initiatorId/confirmerId columns changed to STRING.');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to INTEGER (might fail if they contain strings, but standard for down migration)
    await queryInterface.changeColumn('HandoverCode', 'initiatorId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.changeColumn('HandoverCode', 'confirmerId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
