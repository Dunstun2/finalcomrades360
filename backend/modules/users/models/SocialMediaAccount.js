const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SocialMediaAccount extends Model {}

  SocialMediaAccount.init({
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    // Link to User's referralCode for tracking
    userReferralCode: { 
      type: DataTypes.STRING, 
      allowNull: false,
      references: {
        model: 'User',
        key: 'referralCode'
      }
    },
    platform: { 
      type: DataTypes.ENUM(
        'Facebook', 
        'Instagram', 
        'Twitter', 
        'LinkedIn', 
        'TikTok', 
        'YouTube', 
        'WhatsApp', 
        'Telegram', 
        'Snapchat', 
        'Pinterest'
      ), 
      allowNull: false 
    },
    handle: { 
      type: DataTypes.STRING, 
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    isVerified: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    verifiedAt: { 
      type: DataTypes.DATE, 
      allowNull: true 
    },
    verificationStatus: { 
      type: DataTypes.ENUM('pending', 'verified', 'failed', 'rejected'), 
      defaultValue: 'pending' 
    },
    verificationMessage: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    // Store the actual social media profile URL for reference
    profileUrl: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    // Additional metadata
    metadata: { 
      type: DataTypes.JSON, 
      allowNull: true,
      defaultValue: {} 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true 
    },
    lastUsedAt: { 
      type: DataTypes.DATE, 
      allowNull: true 
    },
    // Analytics data
    totalClicks: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    totalConversions: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    totalEarnings: { 
      type: DataTypes.DECIMAL(10, 2), 
      defaultValue: 0.00 
    }
  }, {
    sequelize,
    timestamps: true,
    modelName: 'SocialMediaAccount',
    tableName: 'SocialMediaAccount',
    indexes: [
      {
        unique: true,
        fields: ['userReferralCode', 'platform', 'handle']
      },
      {
        fields: ['userReferralCode']
      },
      {
        fields: ['platform']
      },
      {
        fields: ['isVerified']
      }
    ]
  });

  // Define associations
  SocialMediaAccount.associate = function(models) {
    // SocialMediaAccount belongs to User via referralCode
    SocialMediaAccount.belongsTo(models.User, {
      foreignKey: 'userReferralCode',
      targetKey: 'referralCode',
      as: 'user'
    });
  };

  return SocialMediaAccount;
};