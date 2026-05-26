const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ProductReview = sequelize.define('ProductReview', {
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'ProductReviews',
    timestamps: true
  });

  ProductReview.associate = function(models) {
    ProductReview.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    ProductReview.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return ProductReview;
};
