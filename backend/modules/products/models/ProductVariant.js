const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductVariant extends Model { }

  ProductVariant.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Product',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false // e.g., "Color", "Size", "Material"
    },
    type: {
      type: DataTypes.ENUM('color', 'size', 'material', 'style', 'custom'),
      defaultValue: 'custom'
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      // Structure: [{ value: "Red", priceModifier: 100, inventory: 50, sku: "PROD-RED" }]
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ProductVariant',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['productId', 'displayOrder']
      }
    ]
  });

  // Define associations
  ProductVariant.associate = function (models) {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'Product',
      onDelete: 'CASCADE'
    });
  };

  return ProductVariant;
};