const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionUsage extends Model {
    static associate(models) {
      SubscriptionUsage.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
      SubscriptionUsage.belongsTo(models.Feature, { foreignKey: 'featureCode', targetKey: 'code', as: 'feature' });
    }
  }

  SubscriptionUsage.init({
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
    featureCode: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Feature',
        key: 'code'
      }
    },
    quantityUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    quantityLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastResetDate: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'SubscriptionUsage',
    freezeTableName: true,
    timestamps: true
  });

  return SubscriptionUsage;
};
