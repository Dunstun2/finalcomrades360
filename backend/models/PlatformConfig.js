// backend/models/PlatformConfig.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const PlatformConfig = sequelize.define("PlatformConfig", {
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    freezeTableName: true,  // disables automatic pluralization
    timestamps: true
  });

  return PlatformConfig;
};
