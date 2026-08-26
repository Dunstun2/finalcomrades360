'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Make billingCycle nullable in Plan table
      await queryInterface.changeColumn('Plan', 'billingCycle', {
        type: Sequelize.ENUM('weekly', 'monthly', 'daily'),
        allowNull: true
      }, { transaction });

      await transaction.commit();
      console.log('✅ billingCycle column made nullable in Plan table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Make billingCycle required again
      await queryInterface.changeColumn('Plan', 'billingCycle', {
        type: Sequelize.ENUM('weekly', 'monthly', 'daily'),
        allowNull: false
      }, { transaction });

      await transaction.commit();
      console.log('✅ billingCycle column made required in Plan table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};