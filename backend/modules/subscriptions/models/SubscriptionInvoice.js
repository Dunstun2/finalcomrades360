const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionInvoice extends Model {
    static associate(models) {
      SubscriptionInvoice.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
    }
  }

  SubscriptionInvoice.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Subscription',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.ENUM('wallet', 'mpesa'),
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SubscriptionInvoice',
    freezeTableName: true,
    timestamps: true
  });

  return SubscriptionInvoice;
};
