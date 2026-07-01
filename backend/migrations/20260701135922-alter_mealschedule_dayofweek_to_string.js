'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('MealSchedule', 'dayOfWeek', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Note: Reverting back to ENUM might fail if there are date strings saved,
    // so it's a best-effort rollback (using Sequelize.STRING to avoid schema failure during rollback on MySQL)
    await queryInterface.changeColumn('MealSchedule', 'dayOfWeek', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  }
};
