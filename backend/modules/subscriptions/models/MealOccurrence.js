const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MealOccurrence extends Model {
    static associate(models) {
      MealOccurrence.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
      MealOccurrence.belongsTo(models.MealSchedule, { foreignKey: 'mealScheduleId', as: 'schedule' });
      MealOccurrence.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
      MealOccurrence.belongsTo(models.PickupStation, { foreignKey: 'pickupStationId', as: 'pickupStation' });
    }
  }

  MealOccurrence.init({
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
    mealScheduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MealSchedule',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'prepared', 'skipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Order',
        key: 'id'
      }
    },
    deliveryAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pickupStationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'PickupStation',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'MealOccurrence',
    freezeTableName: true,
    timestamps: true
  });

  return MealOccurrence;
};
