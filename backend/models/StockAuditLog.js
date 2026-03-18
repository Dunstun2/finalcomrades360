const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockAuditLog = sequelize.define('StockAuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Warehouse',
        key: 'id'
      }
    },
    changeType: {
      type: DataTypes.ENUM(
        'sale',           // Stock sold via order
        'restock',        // Manual restock/replenish
        'adjustment',     // Manual inventory adjustment
        'return',         // Customer return
        'damage',         // Damaged stock write-off
        'transfer',       // Warehouse transfer
        'reservation',    // Reserved for checkout
        'reservation_release', // Reservation cancelled/expired
        'bulk_import',    // Bulk import operation
        'initial'         // Initial stock entry
      ),
      allowNull: false
    },
    quantityBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock level before change'
    },
    quantityChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Positive for increase, negative for decrease'
    },
    quantityAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock level after change'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Orders',
        key: 'id'
      },
      comment: 'Related order if applicable'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who triggered the change'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Explanation for manual adjustments'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional context (transfer details, bulk import summary, etc.)'
    }
  }, {
    tableName: 'StockAuditLogs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
    indexes: [
      { fields: ['productId'] },
      { fields: ['warehouseId'] },
      { fields: ['changeType'] },
      { fields: ['orderId'] },
      { fields: ['userId'] },
      { fields: ['createdAt'] }
    ]
  });

  StockAuditLog.associate = (models) => {
    StockAuditLog.belongsTo(models.Product, { foreignKey: 'productId' });
    StockAuditLog.belongsTo(models.Warehouse, { foreignKey: 'warehouseId' });
    StockAuditLog.belongsTo(models.Order, { foreignKey: 'orderId' });
    StockAuditLog.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return StockAuditLog;
};
