'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Order', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE'
        },
        orderNumber: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        checkoutGroupId: {
          type: Sequelize.STRING
        },
        checkoutOrderNumber: {
          type: Sequelize.STRING
        },
        total: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        status: {
          type: Sequelize.ENUM('order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'at_warehouse', 'processing', 'ready_for_pickup', 'in_transit', 'delivered', 'completed', 'failed', 'cancelled', 'returned'),
          defaultValue: 'order_placed'
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: false
        },
        paymentType: {
          type: Sequelize.ENUM('cash_on_delivery', 'prepay')
        },
        paymentSubType: {
          type: Sequelize.ENUM('cash', 'mpesa', 'bank_transfer', 'paypal', 'mpesa_prepay', 'airtel_money_prepay', 'bank_transfer_prepay', 'lipa_mdogo_mdogo')
        },
        paymentConfirmed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        deliveryAgentId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        primaryReferralCode: {
          type: Sequelize.STRING,
          comment: 'Referral code entered at checkout (order-specific)'
        },
        secondaryReferralCode: {
          type: Sequelize.STRING,
          comment: 'Referral code from user registration (User.referredByReferralCode)'
        },
        totalCommission: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        deliveryFee: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        deliveryAddress: {
          type: Sequelize.TEXT
        },
        deliveryMethod: {
          type: Sequelize.STRING
        },
        pickStation: {
          type: Sequelize.STRING
        },
        addressDetails: {
          type: Sequelize.TEXT
        },
        addressUpdatedAt: {
          type: Sequelize.DATE
        },
        addressUpdatedBy: {
          type: Sequelize.ENUM('customer', 'admin')
        },
        cancelledAt: {
          type: Sequelize.DATE
        },
        cancelReason: {
          type: Sequelize.TEXT
        },
        cancelledBy: {
          type: Sequelize.ENUM('customer', 'admin', 'system')
        },
        trackingNumber: {
          type: Sequelize.STRING
        },
        trackingUpdates: {
          type: Sequelize.TEXT
        },
        estimatedDelivery: {
          type: Sequelize.DATE
        },
        actualDelivery: {
          type: Sequelize.DATE
        },
        deliveryNotes: {
          type: Sequelize.TEXT
        },
        deliveryAttempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        lastDeliveryAttempt: {
          type: Sequelize.DATE
        },
        paymentId: {
          type: Sequelize.STRING
        },
        items: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
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
        shippingType: {
          type: Sequelize.ENUM('shipped_from_seller', 'collected_from_seller')
        },
        sellerConfirmed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        sellerConfirmedAt: {
          type: Sequelize.DATE
        },
        sellerConfirmedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        superAdminConfirmed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        superAdminConfirmedAt: {
          type: Sequelize.DATE
        },
        superAdminConfirmedBy: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        warehouseArrivalDate: {
          type: Sequelize.DATE
        },
        pickedUpAt: {
          type: Sequelize.DATE,
          comment: 'When delivery agent confirmed collection/pickup'
        },
        communicationLog: {
          type: Sequelize.JSON
        },
        isMarketingOrder: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        customerName: {
          type: Sequelize.STRING
        },
        customerPhone: {
          type: Sequelize.STRING
        },
        customerEmail: {
          type: Sequelize.STRING
        },
        marketingDeliveryAddress: {
          type: Sequelize.TEXT
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Warehouse',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Origin warehouse for warehouse_to_customer'
        },
        deliveryType: {
          type: Sequelize.ENUM('warehouse_to_customer', 'customer_to_warehouse', 'seller_to_customer', 'seller_to_warehouse', 'warehouse_to_seller', 'warehouse_to_pickup_station', 'seller_to_pickup_station', 'pickup_station_to_customer', 'pickup_station_to_warehouse'),
          comment: 'Type of delivery route — null until admin specifies during assignment'
        },
        pickupLocation: {
          type: Sequelize.TEXT,
          comment: 'Pickup address for customer_to_warehouse or seller_to_customer deliveries'
        },
        deliveryInstructions: {
          type: Sequelize.TEXT,
          comment: 'Special instructions for delivery agent'
        },
        deliveryRating: {
          type: Sequelize.INTEGER,
          comment: 'Customer rating for delivery (1-5 stars)'
        },
        deliveryReview: {
          type: Sequelize.TEXT,
          comment: 'Customer feedback for delivery'
        },
        deliveryRatedAt: {
          type: Sequelize.DATE,
          comment: 'Timestamp when delivery was rated'
        },
        deliveryLat: {
          type: Sequelize.DECIMAL(10, 8),
          comment: 'Latitude for customer delivery location'
        },
        deliveryLng: {
          type: Sequelize.DECIMAL(11, 8),
          comment: 'Longitude for customer delivery location'
        },
        submissionDeadline: {
          type: Sequelize.DATE,
          comment: 'Deadline for seller to drop off at warehouse'
        },
        pickupStationId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'PickupStation',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'FK to PickupStation'
        },
        selfDispatcherName: {
          type: Sequelize.STRING
        },
        selfDispatcherContact: {
          type: Sequelize.STRING
        },
        expectedWarehouseArrival: {
          type: Sequelize.DATE
        },
        sellerHandoverConfirmed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        sellerHandoverConfirmedAt: {
          type: Sequelize.DATE
        },
        marketerId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'User',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'FK to User (marketer) who placed the order'
        },
        processingBy: {
          type: Sequelize.INTEGER,
          comment: 'User ID of admin/logistics manager currently editing'
        },
        processingAction: {
          type: Sequelize.STRING,
          comment: 'Type of action being performed (e.g., assigning, auditing)'
        },
        processingTimeout: {
          type: Sequelize.DATE,
          comment: 'When the current processing lock expires'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
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
    // await queryInterface.addIndex('Order', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Order');
  }
};
