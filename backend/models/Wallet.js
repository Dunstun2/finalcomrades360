const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  const Wallet = sequelize.define("Wallet", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 },
    pendingBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
    successBalance: { type: DataTypes.FLOAT, defaultValue: 0 }
  }, {
    freezeTableName: true,  // disables automatic pluralization
    timestamps: true
  });

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Wallet;
};
