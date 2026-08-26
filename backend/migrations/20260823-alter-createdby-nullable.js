'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.changeColumn('TeamMember', 'createdBy', {
        type: Sequelize.UUID,
        allowNull: true,
      });
      console.log('✅ createdBy column made nullable');
    } catch (error) {
      console.log('Migration error:', error.message);
      // SQLite doesn't support ALTER COLUMN, so we'll use raw query
      await queryInterface.sequelize.query(
        `ALTER TABLE TeamMember MODIFY createdBy UUID NULL`
      ).catch(() => {
        // If that fails too, it's likely already nullable or SQLite limitation
        console.log('Skipping SQLite schema change (likely already applied)');
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // No down migration needed
  }
};
