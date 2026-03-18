'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('FastFoods')) return;

    await queryInterface.createTable('FastFoods', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        category: {
          type: Sequelize.STRING,
          allowNull: false
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
        shortDescription: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT
        },
        mainImage: {
          type: Sequelize.STRING,
          defaultValue: '/uploads/default-food.jpg'
        },
        galleryImages: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        basePrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        discountPercentage: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        displayPrice: {
          type: Sequelize.DECIMAL(10, 2)
        },
        discountPrice: {
          type: Sequelize.DECIMAL(10, 2)
        },
        availableFrom: {
          type: Sequelize.STRING
        },
        availableTo: {
          type: Sequelize.STRING
        },
        availabilityDays: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        preparationTimeMinutes: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        sizeVariants: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        isComboOption: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        comboOptions: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        ingredients: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        kitchenVendor: {
          type: Sequelize.STRING
        },
        vendorLocation: {
          type: Sequelize.STRING,
          comment: 'Human readable address/location of the kitchen'
        },
        vendorLat: {
          type: Sequelize.DECIMAL(10, 8),
          comment: 'Latitude for distance calculation'
        },
        vendorLng: {
          type: Sequelize.DECIMAL(11, 8),
          comment: 'Longitude for distance calculation'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        deliveryTimeEstimateMinutes: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        pickupAvailable: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        pickupLocation: {
          type: Sequelize.STRING
        },
        deliveryAreaLimits: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        vendor: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        ratings: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        orderCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'pending', 'approved', 'suspended'),
          allowNull: false,
          defaultValue: 'pending'
        },
        reviewStatus: {
          type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
          defaultValue: 'pending'
        },
        approved: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        hasBeenApproved: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        reviewNotes: {
          type: Sequelize.TEXT
        },
        rejectionReason: {
          type: Sequelize.TEXT
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
        changes: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        tags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        isAvailable: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        allergens: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        customizations: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        estimatedServings: {
          type: Sequelize.STRING,
          defaultValue: '1 person'
        },
        dietaryTags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        isFeatured: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        minOrderQty: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        maxOrderQty: {
          type: Sequelize.INTEGER
        },
        deliveryFeeType: {
          type: Sequelize.ENUM('fixed', 'percentage', 'free'),
          allowNull: false,
          defaultValue: 'fixed'
        },
        deliveryFee: {
          type: Sequelize.DECIMAL(10, 2),
          comment: 'Must be set by superadmin during listing. null=not set, 0=free delivery'
        },
        deliveryCoverageZones: {
          type: Sequelize.TEXT
        },
        marketingEnabled: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        marketingCommissionType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'flat'
        },
        marketingCommissionPercentage: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        marketingCommission: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        marketingDuration: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30
        },
        marketingStartDate: {
          type: Sequelize.STRING
        },
        marketingEndDate: {
          type: Sequelize.STRING
        },
        availabilityMode: {
          type: Sequelize.ENUM('AUTO', 'OPEN', 'CLOSED'),
          allowNull: false,
          defaultValue: 'AUTO',
          comment: 'Manual status override: AUTO follows schedule, OPEN forces open, CLOSED forces closed'
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
    // await queryInterface.addIndex('FastFoods', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FastFoods');
  }
};
