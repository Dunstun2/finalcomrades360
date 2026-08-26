const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BenefitPackage extends Model {
    static associate(models) {
      BenefitPackage.hasMany(models.PackageBenefit, { foreignKey: 'packageId', as: 'benefits' });
      BenefitPackage.hasMany(models.Plan, { foreignKey: 'benefitPackageId', as: 'plans' });
    }
  }

  BenefitPackage.init({
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
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'standard'
    }
  }, {
    sequelize,
    modelName: 'BenefitPackage',
    freezeTableName: true,
    timestamps: true
  });

  return BenefitPackage;
};
