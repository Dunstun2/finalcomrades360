const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WarehouseStock = sequelize.define('WarehouseStock', {
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
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Warehouse',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Available stock at this warehouse'
    },
    reserved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Quantity reserved for pending orders'
    },
    reorderPoint: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
      comment: 'Threshold to trigger restock notification'
    },
    lastRestockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last restock timestamp'
    },
    lastRestockedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    }
  }, {
    tableName: 'WarehouseStocks',
    timestamps: true,
    indexes: [
      { fields: ['productId', 'warehouseId'], unique: true },
      { fields: ['warehouseId'] },
      { fields: ['quantity'] }
    ]
  });

  WarehouseStock.associate = (models) => {
    WarehouseStock.belongsTo(models.Product, { foreignKey: 'productId' });
    WarehouseStock.belongsTo(models.Warehouse, { foreignKey: 'warehouseId' });
    WarehouseStock.belongsTo(models.User, { foreignKey: 'lastRestockedBy', as: 'restockedBy' });
  };

  return WarehouseStock;
};
