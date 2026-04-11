'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Transaction', 'walletType', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Which wallet this transaction belongs to: seller, delivery_agent, customer, marketer, service_provider'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Transaction', 'walletType');
  }
};
