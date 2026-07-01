const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define("UserRole", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false }
  }, { 
    freezeTableName: true,
    timestamps: true 
  });

  return UserRole;
};
