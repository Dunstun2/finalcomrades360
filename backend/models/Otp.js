const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Otp = sequelize.define('Otp', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'Otps',
    timestamps: true
  });

  return Otp;
};
