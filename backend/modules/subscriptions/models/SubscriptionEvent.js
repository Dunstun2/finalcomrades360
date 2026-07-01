const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionEvent extends Model {
    static associate(models) {
      SubscriptionEvent.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
      SubscriptionEvent.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      SubscriptionEvent.belongsTo(models.Plan, { foreignKey: 'oldPlanId', as: 'oldPlan' });
      SubscriptionEvent.belongsTo(models.Plan, { foreignKey: 'newPlanId', as: 'newPlan' });
      SubscriptionEvent.belongsTo(models.User, { foreignKey: 'performedBy', as: 'performer' });
    }
  }

  SubscriptionEvent.init({
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    oldPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Plan',
        key: 'id'
      }
    },
    newPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Plan',
        key: 'id'
      }
    },
    performedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SubscriptionEvent',
    freezeTableName: true,
    timestamps: true
  });

  return SubscriptionEvent;
};
