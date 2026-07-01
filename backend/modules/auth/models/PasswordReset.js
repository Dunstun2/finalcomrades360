const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordReset extends Model {}

PasswordReset.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  sequelize,
  modelName: 'PasswordReset',
  freezeTableName: true,
  timestamps: true
})

  return PasswordReset;
};
