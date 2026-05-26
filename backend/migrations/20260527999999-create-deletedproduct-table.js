module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DeletedProducts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
          model: 'Users',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      shortDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fullDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true
      },
      unitOfMeasure: {
        type: Sequelize.STRING,
        allowNull: true
      },
      model: {
        type: Sequelize.STRING,
        allowNull: true
      },
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      displayPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Categories',
          key: 'id'
        }
      },
      subcategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Subcategories',
          key: 'id'
        }
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      keyFeatures: {
        type: Sequelize.JSON,
        allowNull: true
      },
      specifications: {
        type: Sequelize.JSON,
        allowNull: true
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      variants: {
        type: Sequelize.JSON,
        allowNull: true
      },
      logistics: {
        type: Sequelize.JSON,
        allowNull: true
      },
      deliveryMethod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      warranty: {
        type: Sequelize.STRING,
        allowNull: true
      },
      returnPolicy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      weight: {
        type: Sequelize.STRING,
        allowNull: true
      },
      length: {
        type: Sequelize.STRING,
        allowNull: true
      },
      width: {
        type: Sequelize.STRING,
        allowNull: true
      },
      height: {
        type: Sequelize.STRING,
        allowNull: true
      },
      keywords: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shareableLink: {
        type: Sequelize.STRING,
        allowNull: true
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
        type: Sequelize.TEXT,
        allowNull: true
      },
      visibilityStatus: {
        type: Sequelize.ENUM('visible', 'hidden'),
        defaultValue: 'visible'
      },
      relatedProducts: {
        type: Sequelize.JSON,
        allowNull: true
      },
      deletionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      autoDeleteAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this record will be permanently deleted (30 days from deletion)'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
    // Add indexes only if they do not already exist to prevent duplicate errors in production
    try {
      await queryInterface.addIndex('DeletedProducts', ['sellerId'], { name: 'deleted_products_seller_id' });
    } catch (e) {
      // Ignore duplicate index error
    }
    try {
      await queryInterface.addIndex('DeletedProducts', ['autoDeleteAt'], { name: 'deleted_products_autoDeleteAt' });
    } catch (e) {
      // Ignore duplicate index error
    }
    try {
      await queryInterface.addIndex('DeletedProducts', ['originalId'], { name: 'deleted_products_originalId' });
    } catch (e) {
      // Ignore duplicate index error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DeletedProducts');
  }
};
