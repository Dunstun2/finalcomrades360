
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('User');

    if (!tableInfo.autoConfirmFastFood) {
      await queryInterface.addColumn('User', 'autoConfirmFastFood', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.autoConfirmProducts) {
      await queryInterface.addColumn('User', 'autoConfirmProducts', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.defaultProductShippingType) {
      await queryInterface.addColumn('User', 'defaultProductShippingType', {
        type: DataTypes.STRING, // Using STRING for flexibility, can be 'collected_from_seller' or 'seller_to_warehouse'
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('User', 'autoConfirmFastFood');
    await queryInterface.removeColumn('User', 'autoConfirmProducts');
    await queryInterface.removeColumn('User', 'defaultProductShippingType');
  }
};
