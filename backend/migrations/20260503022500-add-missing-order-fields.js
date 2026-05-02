'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('Order');
      
      if (!tableInfo.thankYouSent) {
        await queryInterface.addColumn('Order', 'thankYouSent', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether the automated thank you message has been sent'
        });
        console.log('✅ Added thankYouSent to Order table');
      }

      if (!tableInfo.originalTextBlock) {
        await queryInterface.addColumn('Order', 'originalTextBlock', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Original text block used to create this direct order'
        });
        console.log('✅ Added originalTextBlock to Order table');
      }
    } catch (error) {
      console.error('❌ Migration failed for Order table fields:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('Order', 'thankYouSent');
      await queryInterface.removeColumn('Order', 'originalTextBlock');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }
};
