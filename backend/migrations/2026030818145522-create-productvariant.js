'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ProductVariant')) return;

    await queryInterface.createTable('ProductVariant', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Product',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('color', 'size', 'material', 'style', 'custom'),
          defaultValue: 'custom'
        },
        options: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: []
        },
        displayOrder: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        isRequired: {
          type: Sequelize.BOOLEAN,
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
    
    // Add indexes if needed
    // await queryInterface.addIndex('ProductVariant', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductVariant');
  }
};
