const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductDeletionRequest = sequelize.define('ProductDeletionRequest', {
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
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['sellerId']
      },
      {
        fields: ['status']
      }
    ]
  });

  ProductDeletionRequest.associate = (models) => {
    ProductDeletionRequest.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });
    ProductDeletionRequest.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
  };

  return ProductDeletionRequest;
};