const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Wishlist extends Model { }

  Wishlist.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fastFoodId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    itemType: {
      type: DataTypes.ENUM('product', 'service', 'fastfood'),
      allowNull: false,
      defaultValue: 'product'
    }
  }, {
    sequelize,
    modelName: 'Wishlist',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'productId', 'serviceId', 'fastFoodId', 'itemType']
      }
    ]
  });

  // Define associations
  Wishlist.associate = function (models) {
    Wishlist.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'User'
    });

    Wishlist.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'Product'
    });

    Wishlist.belongsTo(models.Service, {
      foreignKey: 'serviceId',
      as: 'Service'
    });

    Wishlist.belongsTo(models.FastFood, {
      foreignKey: 'fastFoodId',
      as: 'FastFood'
    });
  };

  return Wishlist;
};