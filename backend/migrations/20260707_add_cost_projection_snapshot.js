'use strict';

/**
 * Migration: Add costProjectionSnapshot to Subscription
 * 
 * Adds a JSON field to store the pre-calculated Schedule & Projected Cost table
 * data so customers see the exact same breakdown shown during subscription creation.
 * 
 * Database-agnostic: Works with SQLite and MySQL
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('📊 Adding costProjectionSnapshot column to Subscription table...');

      await queryInterface.addColumn(
        'Subscription',
        'costProjectionSnapshot',
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Stores the pre-calculated cost breakdown table data including delivery fees, benefits, and totals'
        },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migration completed: costProjectionSnapshot column added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔄 Removing costProjectionSnapshot column from Subscription table...');

      await queryInterface.removeColumn(
        'Subscription',
        'costProjectionSnapshot',
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Rollback completed: costProjectionSnapshot column removed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
