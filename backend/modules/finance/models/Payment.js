const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,  // null for cart-based (pre-order) payments
      references: {
        model: 'Order',
        key: 'id'
      }
    },
    checkoutGroupId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM('mpesa', 'bank_transfer', 'lipa_mdogo_mdogo', 'card'),
      allowNull: false
    },
    paymentType: {
      type: DataTypes.ENUM('prepay', 'cash_on_delivery'),
      allowNull: false,
      defaultValue: 'prepay'
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'KES'
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded'
      ),
      allowNull: false,
      defaultValue: 'pending'
    },
    // M-Pesa specific fields
    mpesaReceiptNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mpesaTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mpesaPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mpesaMerchantRequestId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mpesaCheckoutRequestId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Bank transfer specific fields
    bankReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // General payment fields
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    externalTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true // JSON string for additional payment data
    },
    // Refund fields
    refundAmount: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Security and tracking
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    callbackUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Timestamps for payment flow
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiredAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentMethod']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['mpesaCheckoutRequestId']
      },
      {
        fields: ['checkoutGroupId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Define associations
  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Payment;
};