// Migration to allow NULL for categoryId in DeletedProduct table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make categoryId nullable using Sequelize API (MySQL compatible)
    await queryInterface.changeColumn('DeletedProducts', 'categoryId', { type: Sequelize.INTEGER, allowNull: true });
  },
  down: async (queryInterface, Sequelize) => {
    // Revert to NOT NULL constraint
    await queryInterface.changeColumn('DeletedProducts', 'categoryId', { type: Sequelize.INTEGER, allowNull: false });
  }
};
