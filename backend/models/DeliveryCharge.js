const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const DeliveryCharge = sequelize.define('DeliveryCharge', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    deliveryTaskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    routeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    payerType: {
      type: DataTypes.ENUM('seller', 'customer', 'platform'),
      allowNull: false,
      defaultValue: 'platform'
    },
    payerUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    payeeUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    grossAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    chargedAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    outstandingAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    agentSharePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    agentAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    platformAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    sellerMerchandisePayout: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    fundingSource: {
      type: DataTypes.ENUM('seller_wallet', 'order_delivery_fee', 'platform', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown'
    },
    fundingStatus: {
      type: DataTypes.ENUM('quoted', 'charged', 'settled', 'reversed'),
      allowNull: false,
      defaultValue: 'quoted'
    },
    quotedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    invoicedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    chargedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['deliveryTaskId'], unique: true },
      { fields: ['payerType'] },
      { fields: ['fundingStatus'] },
      { fields: ['routeType'] }
    ]
  });

  DeliveryCharge.associate = (models) => {
    DeliveryCharge.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    DeliveryCharge.belongsTo(models.DeliveryTask, { foreignKey: 'deliveryTaskId', as: 'deliveryTask' });
    DeliveryCharge.belongsTo(models.User, { foreignKey: 'payerUserId', as: 'payer' });
    DeliveryCharge.belongsTo(models.User, { foreignKey: 'payeeUserId', as: 'payee' });
  };

  return DeliveryCharge;
};