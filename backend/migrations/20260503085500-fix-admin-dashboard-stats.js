'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const userTable = await queryInterface.describeTable('User');
      
      // 1. Missing Analytics Columns in User Table
      if (!userTable.isDeactivated) {
        await queryInterface.addColumn('User', 'isDeactivated', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('✅ Added isDeactivated to User table');
      }

      if (!userTable.deletionRequested) {
        await queryInterface.addColumn('User', 'deletionRequested', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        });
        console.log('✅ Added deletionRequested to User table');
      }

      if (!userTable.applicationStatus) {
        await queryInterface.addColumn('User', 'applicationStatus', {
          type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'),
          defaultValue: 'none'
        });
        console.log('✅ Added applicationStatus to User table');
      }

      // 2. Missing Analytics Columns in Order Table
      const orderTable = await queryInterface.describeTable('Order');
      if (!orderTable.isMarketingOrder) {
        await queryInterface.addColumn('Order', 'isMarketingOrder', {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        });
        console.log('✅ Added isMarketingOrder to Order table');
      }

    } catch (error) {
      console.error('❌ Migration failed for Admin Dashboard stats fields:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('User', 'isDeactivated');
      await queryInterface.removeColumn('User', 'deletionRequested');
      // ENUMs are harder to remove in some dialects, but Sequelize handles it usually
      await queryInterface.removeColumn('Order', 'isMarketingOrder');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }
};
