module.exports = (sequelize, DataTypes) => {
  const AdminAuditLog = sequelize.define('AdminAuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adminId: { type: DataTypes.INTEGER, allowNull: false, comment: 'ID of the admin who performed the action' },
    adminName: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false, comment: 'e.g. FORCE_RESET_PASSWORD, MERGE_ACCOUNTS, FORCE_ORDER_STATUS' },
    targetType: { type: DataTypes.STRING, allowNull: true, comment: 'e.g. User, Order, Product' },
    targetId: { type: DataTypes.STRING, allowNull: true, comment: 'ID of the entity affected' },
    targetName: { type: DataTypes.STRING, allowNull: true, comment: 'Human-readable label of the target' },
    details: { type: DataTypes.JSON, allowNull: true, comment: 'Extra context (before/after state, reason, etc.)' },
    ip: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
  }, {
    freezeTableName: true,
    timestamps: true,
    tableName: 'AdminAuditLog'
  });

  AdminAuditLog.associate = (models) => {
    AdminAuditLog.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
  };

  return AdminAuditLog;
};
