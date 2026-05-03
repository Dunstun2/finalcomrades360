'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('User');
      
      // 1. Security Columns
      if (!tableInfo.tokenVersion) {
        await queryInterface.addColumn('User', 'tokenVersion', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Increment to invalidate all existing JWTs for this user'
        });
        console.log('✅ Added tokenVersion to User table');
      }

      if (!tableInfo.tokenInvalidatedAt) {
        await queryInterface.addColumn('User', 'tokenInvalidatedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when tokens were last invalidated'
        });
        console.log('✅ Added tokenInvalidatedAt to User table');
      }

      // 2. Suspended Roles
      if (!tableInfo.suspendedRoles) {
        await queryInterface.addColumn('User', 'suspendedRoles', {
          type: Sequelize.JSON,
          defaultValue: [],
          comment: 'Array of roles that are suspended for this user'
        });
        console.log('✅ Added suspendedRoles to User table');
      }

      // 3. Frozen Status
      if (!tableInfo.isFrozen) {
        await queryInterface.addColumn('User', 'isFrozen', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('✅ Added isFrozen to User table');
      }
      
    } catch (error) {
      console.error('❌ Migration failed for User table security fields:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('User', 'tokenVersion');
      await queryInterface.removeColumn('User', 'tokenInvalidatedAt');
      await queryInterface.removeColumn('User', 'suspendedRoles');
      await queryInterface.removeColumn('User', 'isFrozen');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }
};
