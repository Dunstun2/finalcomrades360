module.exports = (sequelize, DataTypes) => {
  const PromoCode = sequelize.define('PromoCode', {
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    discountPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    autoApply: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    orderType: {
      type: DataTypes.STRING,
      defaultValue: 'all', // 'all', 'fastfood', 'product'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional: tracking who created it
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    targetAudience: {
      type: DataTypes.ENUM('all', 'new_users'),
      defaultValue: 'all',
    },
    applicableProductIds: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    minOrderValue: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    maxDiscountAmount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    maxUsageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    minUserOrderCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    minUserLifetimeSpend: {
      type: DataTypes.FLOAT,
      allowNull: true,
    }
  }, {
    tableName: 'promo_codes',
    timestamps: true,
  });

  PromoCode.associate = (models) => {
    // associations can be defined here if needed
  };

  return PromoCode;
};
