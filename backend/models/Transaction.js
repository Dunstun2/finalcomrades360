const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model { }

  Transaction.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.FLOAT, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false }, // e.g., "credit" or "debit"
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      description: { type: DataTypes.STRING, allowNull: true },
      note: { type: DataTypes.STRING, allowNull: true },
      orderId: { type: DataTypes.INTEGER, allowNull: true },
      checkoutGroupId: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      fee: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      walletType: { type: DataTypes.STRING, allowNull: true, defaultValue: null }
    },
    {
      sequelize,
      modelName: "Transaction",
      freezeTableName: true,  // table name will exactly match model name
      timestamps: true         // ✅ fixed typo here
    }
  );

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Transaction;
};
