'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Order', 'cashbackProcessed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether cashback has been processed for this order'
    });

    await queryInterface.addColumn('Order', 'cashbackAmount', {
      type: Sequelize.FLOAT,
      defaultValue: 0,
      allowNull: false,
      comment: 'Amount of cashback credited for this order'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Order', 'cashbackProcessed');
    await queryInterface.removeColumn('Order', 'cashbackAmount');
  }
};
