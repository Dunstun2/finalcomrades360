// Migration to allow NULL for categoryId in DeletedProduct table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Use raw query to modify column constraint
    await queryInterface.sequelize.query('ALTER TABLE "DeletedProducts" ALTER COLUMN "categoryId" DROP NOT NULL;');
  },
  down: async (queryInterface, Sequelize) => {
    // Revert: make categoryId NOT NULL again (assuming no rows have NULL)
    await queryInterface.sequelize.query('ALTER TABLE "DeletedProducts" ALTER COLUMN "categoryId" SET NOT NULL;');
  }
};
