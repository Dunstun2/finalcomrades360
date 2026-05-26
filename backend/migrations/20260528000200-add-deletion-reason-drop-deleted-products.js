module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add deletionReason to Product
    await queryInterface.addColumn('Product', 'deletionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(err => {
      console.warn("Product.deletionReason might already exist:", err.message);
    });

    // 2. Add deletionReason to FastFoods
    await queryInterface.addColumn('FastFoods', 'deletionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(err => {
      console.warn("FastFoods.deletionReason might already exist:", err.message);
    });

    // 3. Drop DeletedProducts table if it exists
    await queryInterface.dropTable('DeletedProducts').catch(err => {
      console.warn("DeletedProducts table might not exist:", err.message);
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Product', 'deletionReason').catch(() => {});
    await queryInterface.removeColumn('FastFoods', 'deletionReason').catch(() => {});
    // Cannot easily recreate DeletedProducts in down migration without redefining the entire schema,
    // so we'll leave it out since it's a destructive change.
  }
};
