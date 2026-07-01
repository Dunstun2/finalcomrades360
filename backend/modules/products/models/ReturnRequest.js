const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReturnRequest = sequelize.define('ReturnRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Customer who requested the return'
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    items: {
      type: DataTypes.TEXT,  // Store as JSON string — SQLite-safe
      allowNull: false,
      comment: 'JSON array of items: [{orderItemId, quantity, reason}]',
      get() {
        const val = this.getDataValue('items');
        try { return val ? JSON.parse(val) : []; } catch { return []; }
      },
      set(val) {
        this.setDataValue('items', JSON.stringify(val || []));
      }
    },
    reasonCategory: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    images: {
      type: DataTypes.TEXT,  // Store as JSON string — SQLite-safe
      allowNull: true,
      comment: 'JSON array of image URLs',
      get() {
        const val = this.getDataValue('images');
        try { return val ? JSON.parse(val) : []; } catch { return []; }
      },
      set(val) {
        this.setDataValue('images', JSON.stringify(val || []));
      }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    pickupMethod: {
      type: DataTypes.STRING,
      defaultValue: 'agent_pickup'
    },
    pickupAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pickupStationId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refundId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ReturnRequests',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['userId'] },
      { fields: ['sellerId'] },
      { fields: ['status'] }
    ]
  });

  ReturnRequest.associate = (models) => {
    ReturnRequest.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    ReturnRequest.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ReturnRequest.belongsTo(models.User, { foreignKey: 'sellerId', as: 'seller' });
    ReturnRequest.belongsTo(models.PickupStation, { foreignKey: 'pickupStationId', as: 'pickupStation' });
    ReturnRequest.belongsTo(models.Refund, { foreignKey: 'refundId', as: 'refund' });
  };

  return ReturnRequest;
};
