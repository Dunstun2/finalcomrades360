const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PlanBenefit extends Model {
    static associate(models) {
      PlanBenefit.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
      PlanBenefit.belongsTo(models.Feature, { foreignKey: 'featureCode', targetKey: 'code', as: 'feature' });
    }
  }

  PlanBenefit.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Plan',
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
    limitType: {
      type: DataTypes.ENUM('boolean', 'counter', 'rate'),
      allowNull: false
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PlanBenefit',
    freezeTableName: true,
    timestamps: true
  });

  return PlanBenefit;
};
