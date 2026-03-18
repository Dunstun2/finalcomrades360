'use strict';

/** @type {import('sequelize-cli').Migration} */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.name || ''))
    .map((table) => String(table).toLowerCase());

  return normalized.includes(tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'FastFoodPickupPoint';

    if (await tableExists(queryInterface, tableName)) {
      return;
    }

    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      contactName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      deliveryFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    const tableName = 'FastFoodPickupPoint';

    if (!(await tableExists(queryInterface, tableName))) {
      return;
    }

    await queryInterface.dropTable(tableName);
  }
};