const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MealSchedule extends Model {
    static associate(models) {
      MealSchedule.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
      MealSchedule.belongsTo(models.PickupStation, { foreignKey: 'pickupStationId', as: 'pickupStation' });
      MealSchedule.belongsTo(models.FastFood, { foreignKey: 'preferredFastFoodItemId', as: 'preferredFastFoodItem' });
      MealSchedule.hasMany(models.MealOccurrence, { foreignKey: 'mealScheduleId', as: 'occurrences' });
    }
  }

  MealSchedule.init({
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
    dayOfWeek: {
      type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      allowNull: false
    },
    mealTimeType: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
      allowNull: false
    },
    preferredTime: {
      type: DataTypes.STRING(5), // e.g., "12:30"
      allowNull: false
    },
    pickupStationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'PickupStation',
        key: 'id'
      }
    },
    deliveryAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    preferredFastFoodItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'FastFoods',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'MealSchedule',
    freezeTableName: true,
    timestamps: true
  });

  return MealSchedule;
};
