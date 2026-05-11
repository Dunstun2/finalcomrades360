'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('Order');
      
      if (!tableInfo.deliveryTimePreference) {
        await queryInterface.addColumn('Order', 'deliveryTimePreference', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Customer preferred time of delivery'
        });
        console.log('✅ Added deliveryTimePreference to Order table');
      } else {
        console.log('ℹ️ deliveryTimePreference already exists in Order table');
      }
    } catch (error) {
      console.error('❌ Migration failed for Order table fields:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('Order', 'deliveryTimePreference');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }
};
