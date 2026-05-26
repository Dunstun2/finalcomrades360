module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Product', 'deletionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(err => {
      console.warn("Product.deletionReason might already exist:", err.message);
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Product', 'deletionReason').catch(() => {});
  }
};
