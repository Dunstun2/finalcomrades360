const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockReservation = sequelize.define('StockReservation', {
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reserved quantity'
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Warehouse',
        key: 'id'
      },
      comment: 'Specific warehouse allocation'
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Checkout session identifier for bulk release'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Order',
        key: 'id'
      },
      comment: 'Null until order created, then fulfilled'
    },
    status: {
      type: DataTypes.ENUM('active', 'fulfilled', 'cancelled', 'expired'),
      defaultValue: 'active',
      comment: 'Lifecycle state of reservation'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes default
      comment: 'Auto-release if expired'
    },
    releasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when released (fulfilled/cancelled/expired)'
    }
  }, {
    tableName: 'StockReservations',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['userId'] },
      { fields: ['sessionId'] },
      { fields: ['status'] },
      { fields: ['expiresAt'] }
    ]
  });

  StockReservation.associate = (models) => {
    StockReservation.belongsTo(models.Product, { foreignKey: 'productId' });
    StockReservation.belongsTo(models.User, { foreignKey: 'userId' });
    StockReservation.belongsTo(models.Warehouse, { foreignKey: 'warehouseId' });
    StockReservation.belongsTo(models.Order, { foreignKey: 'orderId' });
  };

  return StockReservation;
};
