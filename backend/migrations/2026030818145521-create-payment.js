'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payment', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        orderId: {
          type: Sequelize.INTEGER,
          references: {
            model: 'Order',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        checkoutGroupId: {
          type: Sequelize.STRING
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
        paymentMethod: {
          type: Sequelize.ENUM('mpesa', 'bank_transfer', 'lipa_mdogo_mdogo', 'card'),
          allowNull: false
        },
        paymentType: {
          type: Sequelize.ENUM('prepay', 'cash_on_delivery'),
          allowNull: false,
          defaultValue: 'prepay'
        },
        amount: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'KES'
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'),
          allowNull: false,
          defaultValue: 'pending'
        },
        mpesaReceiptNumber: {
          type: Sequelize.STRING
        },
        mpesaTransactionId: {
          type: Sequelize.STRING
        },
        mpesaPhoneNumber: {
          type: Sequelize.STRING
        },
        mpesaMerchantRequestId: {
          type: Sequelize.STRING
        },
        mpesaCheckoutRequestId: {
          type: Sequelize.STRING
        },
        bankReference: {
          type: Sequelize.STRING
        },
        bankName: {
          type: Sequelize.STRING
        },
        accountNumber: {
          type: Sequelize.STRING
        },
        transactionId: {
          type: Sequelize.STRING,
          unique: true
        },
        externalTransactionId: {
          type: Sequelize.STRING
        },
        paymentDate: {
          type: Sequelize.DATE
        },
        failureReason: {
          type: Sequelize.TEXT
        },
        metadata: {
          type: Sequelize.TEXT
        },
        refundAmount: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        refundReason: {
          type: Sequelize.TEXT
        },
        refundedAt: {
          type: Sequelize.DATE
        },
        ipAddress: {
          type: Sequelize.STRING
        },
        userAgent: {
          type: Sequelize.TEXT
        },
        callbackUrl: {
          type: Sequelize.TEXT
        },
        initiatedAt: {
          type: Sequelize.DATE
        },
        completedAt: {
          type: Sequelize.DATE
        },
        expiredAt: {
          type: Sequelize.DATE
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
    // await queryInterface.addIndex('Payment', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Payment');
  }
};
