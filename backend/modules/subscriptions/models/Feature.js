const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Feature extends Model {
    static associate(models) {
      Feature.hasMany(models.PlanBenefit, { foreignKey: 'featureCode', sourceKey: 'code', as: 'benefits' });
      Feature.hasMany(models.SubscriptionUsage, { foreignKey: 'featureCode', sourceKey: 'code', as: 'usages' });
    }
  }

  Feature.init({
    code: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('Analytics', 'Marketing', 'Orders', 'Finance', 'Visibility', 'Support', 'Delivery', 'Meal', 'Limits'),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Feature',
    freezeTableName: true,
    timestamps: true
  });

  return Feature;
};
