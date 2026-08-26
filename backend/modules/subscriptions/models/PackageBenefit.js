const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PackageBenefit extends Model {
    static associate(models) {
      PackageBenefit.belongsTo(models.BenefitPackage, { foreignKey: 'packageId', as: 'package' });
      PackageBenefit.belongsTo(models.Feature, { foreignKey: 'featureCode', targetKey: 'code', as: 'feature' });
    }
  }

  PackageBenefit.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'BenefitPackage',
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
    modelName: 'PackageBenefit',
    freezeTableName: true,
    timestamps: true
  });

  return PackageBenefit;
};
