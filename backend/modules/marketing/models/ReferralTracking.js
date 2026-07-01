const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {

  const ReferralTracking = sequelize.define("ReferralTracking", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    referrerId: { type: DataTypes.INTEGER, allowNull: false }, // marketer who shared
    referredUserId: { type: DataTypes.INTEGER }, // user who clicked/registered
    productId: { type: DataTypes.INTEGER, allowNull: true },
    fastFoodId: { type: DataTypes.INTEGER, allowNull: true },
    serviceId: { type: DataTypes.INTEGER, allowNull: true },
    orderId: { type: DataTypes.INTEGER }, // when purchase is made
    referralCode: { type: DataTypes.STRING, allowNull: false },
    clickedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    convertedAt: { type: DataTypes.DATE }, // when purchase happened
    ipAddress: { type: DataTypes.STRING },
    userAgent: { type: DataTypes.TEXT },
    socialPlatform: { type: DataTypes.STRING } // facebook, twitter, instagram, whatsapp, etc
  }, { freezeTableName: true, timestamps: true });

  return ReferralTracking;
};
