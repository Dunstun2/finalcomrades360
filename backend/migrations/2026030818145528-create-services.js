'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('Services')) return;

    await queryInterface.createTable('Services', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        basePrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Initial price set by seller or super admin'
        },
        isPriceStartingFrom: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        deliveryTime: {
          type: Sequelize.STRING,
          allowNull: false
        },
        availability: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        location: {
          type: Sequelize.STRING,
          allowNull: false
        },
        vendorLocation: {
          type: Sequelize.STRING,
          comment: 'Precise location/address for smart filtering'
        },
        vendorLat: {
          type: Sequelize.DECIMAL(10, 8)
        },
        vendorLng: {
          type: Sequelize.DECIMAL(11, 8)
        },
        isOnline: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'pending', 'approved', 'suspended'),
          allowNull: false,
          defaultValue: 'pending'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'CASCADE',
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
            model: 'Subcategories',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        rating: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        reviewCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        displayPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Reference price set by admin (before discount)'
        },
        discountPrice: {
          type: Sequelize.DECIMAL(10, 2),
          comment: 'Calculated final price: displayPrice - discount'
        },
        discountPercentage: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        deliveryFeeType: {
          type: Sequelize.ENUM('fixed', 'percentage', 'free'),
          allowNull: false,
          defaultValue: 'fixed'
        },
        deliveryFee: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 50
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
        isAvailable: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        availabilityDays: {
          type: Sequelize.JSON,
          defaultValue: [],
          comment: 'Stores weekly schedule: [{day: "Monday", available: true, from: "08:00", to: "17:00"}]'
        },
        availabilityMode: {
          type: Sequelize.ENUM('AUTO', 'OPEN', 'CLOSED'),
          allowNull: false,
          defaultValue: 'AUTO',
          comment: 'Manual status override: AUTO follows schedule, OPEN forces open, CLOSED forces closed'
        },
        isFeatured: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
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
    // await queryInterface.addIndex('Services', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Services');
  }
};
