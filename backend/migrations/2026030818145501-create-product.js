'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('Product')) {
      return; // Already exists, idempotent
    }

    await queryInterface.createTable('Product', {
id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      compareAtPrice: {
        type: Sequelize.DECIMAL(10, 2)
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Base price set by seller'
      },
      displayPrice: {
        type: Sequelize.DECIMAL(10, 2),
        comment: 'Display price set by superadmin (takes priority over basePrice)'
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lowStockThreshold: {
        type: Sequelize.INTEGER,
        defaultValue: 5
      },
      sku: {
        type: Sequelize.STRING,
        unique: true
      },
      barcode: {
        type: Sequelize.STRING,
        unique: true
      },
      weight: {
        type: Sequelize.STRING
      },
      dimensions: {
        type: Sequelize.JSON
      },
      coverImage: {
        type: Sequelize.TEXT
      },
      galleryImages: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      shortDescription: {
        type: Sequelize.TEXT
      },
      fullDescription: {
        type: Sequelize.TEXT
      },
      discountPrice: {
        type: Sequelize.DECIMAL(10, 2)
      },
      discountPercentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isFlashSale: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      unitOfMeasure: {
        type: Sequelize.STRING,
        defaultValue: 'pcs'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'draft', 'archived'),
        defaultValue: 'draft'
      },
      visibilityStatus: {
        type: Sequelize.ENUM('visible', 'hidden'),
        defaultValue: 'visible'
      },
      reviewStatus: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      reviewNotes: {
        type: Sequelize.TEXT
      },
      rejectionReason: {
        type: Sequelize.TEXT
      },
      keyFeatures: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      specifications: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      variants: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      logistics: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      deliveryMethod: {
        type: Sequelize.STRING,
        defaultValue: 'Pickup'
      },
      deliveryCoverageZones: {
        type: Sequelize.TEXT
      },
      deliveryFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      warranty: {
        type: Sequelize.STRING
      },
      returnPolicy: {
        type: Sequelize.TEXT
      },
      keywords: {
        type: Sequelize.TEXT
      },
      shareableLink: {
        type: Sequelize.STRING
      },
      brand: {
        type: Sequelize.STRING
      },
      model: {
        type: Sequelize.STRING
      },
      suspended: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      suspensionReason: {
        type: Sequelize.TEXT
      },
      suspensionEndTime: {
        type: Sequelize.DATE
      },
      suspensionDuration: {
        type: Sequelize.INTEGER
      },
      suspensionDurationUnit: {
        type: Sequelize.STRING
      },
      suspensionAdditionalNotes: {
        type: Sequelize.TEXT
      },
      relatedProducts: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      metaKeywords: {
        type: Sequelize.TEXT
      },
      media: {
        type: Sequelize.JSON
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      approved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      hasBeenApproved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      marketingEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      marketingCommission: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      marketingCommissionType: {
        type: Sequelize.STRING,
        defaultValue: 'flat'
      },
      marketingCommissionPercentage: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      categoryId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Category',
          key: 'id'
        },
        onDelete: 'SET NULL',
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
      sellerId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      addedBy: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      metaTitle: {
        type: Sequelize.STRING
      },
      metaDescription: {
        type: Sequelize.TEXT
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      reviewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      soldCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isDigital: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      downloadUrl: {
        type: Sequelize.STRING
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      flashSalePrice: {
        type: Sequelize.DECIMAL(10, 2)
      },
      flashSaleStart: {
        type: Sequelize.DATE
      },
      flashSaleEnd: {
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Product');
  }
};
