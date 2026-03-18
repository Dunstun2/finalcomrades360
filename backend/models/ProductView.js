const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const ProductView = sequelize.define("ProductView", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER }, // null for anonymous views
    marketerId: { type: DataTypes.INTEGER }, // which marketer's link was used
    ipAddress: { type: DataTypes.STRING },
    userAgent: { type: DataTypes.TEXT },
    referralSource: { type: DataTypes.STRING }, // 'direct', 'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram'
    sessionId: { type: DataTypes.STRING },
    viewDuration: { type: DataTypes.INTEGER, defaultValue: 0 }, // seconds spent viewing
    deviceType: { type: DataTypes.STRING }, // 'mobile', 'desktop', 'tablet'
    location: { type: DataTypes.STRING }, // city/region if available
  }, {
    freezeTableName: true,
    timestamps: true
  });

  // Define associations
  ProductView.associate = (models) => {
    ProductView.belongsTo(models.Product, { foreignKey: 'productId' });
    ProductView.belongsTo(models.User, { foreignKey: 'userId' });
    ProductView.belongsTo(models.User, { foreignKey: 'marketerId', as: 'Marketer' });
  };

  return ProductView;
};
