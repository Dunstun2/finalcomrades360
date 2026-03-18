const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const MarketingAnalytics = sequelize.define("MarketingAnalytics", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  marketerId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  platform: { type: DataTypes.STRING, allowNull: false }, // 'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram', 'tiktok'
  actionType: { type: DataTypes.STRING, allowNull: false }, // 'share', 'click', 'view', 'conversion'
  userId: { type: DataTypes.INTEGER }, // null for anonymous actions
  ipAddress: { type: DataTypes.STRING },
  userAgent: { type: DataTypes.TEXT },
  sessionId: { type: DataTypes.STRING },
  conversionValue: { type: DataTypes.FLOAT, defaultValue: 0 }, // order value if conversion
  commissionEarned: { type: DataTypes.FLOAT, defaultValue: 0 },
  deviceType: { type: DataTypes.STRING }, // 'mobile', 'desktop', 'tablet'
  location: { type: DataTypes.STRING },
  referralCode: { type: DataTypes.STRING },
  shareUrl: { type: DataTypes.TEXT },
  metadata: { type: DataTypes.JSON, defaultValue: {} } // additional tracking data
}, {
  freezeTableName: true,
  timestamps: true
});

  // Define associations
  MarketingAnalytics.associate = (models) => {
    MarketingAnalytics.belongsTo(models.User, { foreignKey: 'marketerId', as: 'Marketer' });
    MarketingAnalytics.belongsTo(models.Product, { foreignKey: 'productId' });
    MarketingAnalytics.belongsTo(models.User, { foreignKey: 'userId', as: 'Customer' });
  };

  return MarketingAnalytics;
};
