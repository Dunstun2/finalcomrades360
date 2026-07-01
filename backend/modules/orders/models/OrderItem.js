const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define("OrderItem", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: true },
    fastFoodId: { type: DataTypes.INTEGER, allowNull: true },
    serviceId: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    variantId: { type: DataTypes.STRING, allowNull: true, comment: 'Identifier for size variant (e.g. "Large")' },
    comboId: { type: DataTypes.STRING, allowNull: true, comment: 'Identifier for combo option' },
    itemLabel: { type: DataTypes.STRING, allowNull: true, comment: 'Human-readable label with variant/combo (e.g. "Burger - Large")' },
    total: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'price * quantity' },
    basePrice: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'original base price from seller' },
    commissionAmount: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'marketing commission for this item' },
    deliveryFee: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'item-specific delivery fee' },
    itemType: { type: DataTypes.ENUM('product', 'fastfood', 'service'), defaultValue: 'product' },
    sellerId: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to User (seller) who owns this item' },
    returnStatus: { type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected', 'completed'), defaultValue: 'none' },
    returnedQuantity: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['productId'] },
      { fields: ['fastFoodId'] },
      { fields: ['itemType'] },
      { fields: ['sellerId'] }
    ]
  });

  // Define associations
  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: "orderId", onDelete: 'CASCADE' });
    OrderItem.belongsTo(models.Product, { foreignKey: "productId" });
    OrderItem.belongsTo(models.FastFood, { foreignKey: "fastFoodId" });
    OrderItem.belongsTo(models.Service, { foreignKey: "serviceId" });
    OrderItem.belongsTo(models.User, { foreignKey: "sellerId", as: "seller" });
  };

  return OrderItem;
};
