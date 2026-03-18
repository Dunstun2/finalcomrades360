'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeletedProduct', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        originalId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Original product ID before deletion'
        },
        sellerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        shortDescription: {
          type: Sequelize.TEXT
        },
        fullDescription: {
          type: Sequelize.TEXT
        },
        brand: {
          type: Sequelize.STRING
        },
        unitOfMeasure: {
          type: Sequelize.STRING
        },
        model: {
          type: Sequelize.STRING
        },
        basePrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        displayPrice: {
          type: Sequelize.DECIMAL(10, 2)
        },
        stock: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        categoryId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Category',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        subcategoryId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Subcategory',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        images: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        keyFeatures: {
          type: Sequelize.JSON
        },
        specifications: {
          type: Sequelize.JSON
        },
        attributes: {
          type: Sequelize.JSON
        },
        variants: {
          type: Sequelize.JSON
        },
        logistics: {
          type: Sequelize.JSON
        },
        deliveryMethod: {
          type: Sequelize.STRING
        },
        warranty: {
          type: Sequelize.STRING
        },
        returnPolicy: {
          type: Sequelize.STRING
        },
        weight: {
          type: Sequelize.STRING
        },
        length: {
          type: Sequelize.STRING
        },
        width: {
          type: Sequelize.STRING
        },
        height: {
          type: Sequelize.STRING
        },
        keywords: {
          type: Sequelize.STRING
        },
        shareableLink: {
          type: Sequelize.STRING
        },
        approved: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        reviewStatus: {
          type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
          defaultValue: 'pending'
        },
        reviewNotes: {
          type: Sequelize.TEXT
        },
        visibilityStatus: {
          type: Sequelize.ENUM('visible', 'hidden'),
          defaultValue: 'visible'
        },
        relatedProducts: {
          type: Sequelize.JSON
        },
        deletionReason: {
          type: Sequelize.TEXT
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        autoDeleteAt: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'When this record will be permanently deleted (30 days from deletion)'
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
    // await queryInterface.addIndex('DeletedProduct', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DeletedProduct');
  }
};
