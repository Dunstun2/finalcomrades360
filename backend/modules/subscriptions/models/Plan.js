const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    static associate(models) {
      Plan.hasMany(models.PlanBenefit, { foreignKey: 'planId', as: 'benefits' });
      Plan.hasMany(models.Subscription, { foreignKey: 'planId', as: 'subscriptions' });
    }
  }

  Plan.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('seller', 'meal', 'service', 'laundry', 'delivery', 'premium_customer'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Published', 'Archived', 'Disabled'),
      allowNull: false,
      defaultValue: 'Draft'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    billingCycle: {
      type: DataTypes.ENUM('weekly', 'monthly', 'daily'),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'KES'
    },
    gracePeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    trialPeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Meal Plan Template — only used when type = 'meal'
    // Stores an array of { dayOfWeek, mealTimeType, preferredTime, fastFoodItemId }
    templateSchedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Plan',
    freezeTableName: true,
    timestamps: true
  });

  return Plan;
};
