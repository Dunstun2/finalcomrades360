const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeletedProduct = sequelize.define('DeletedProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    originalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Original product ID before deletion'
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    shortDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fullDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unitOfMeasure: {
      type: DataTypes.STRING,
      allowNull: true
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    displayPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subcategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    keyFeatures: {
      type: DataTypes.JSON,
      allowNull: true
    },
    specifications: {
      type: DataTypes.JSON,
      allowNull: true
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    variants: {
      type: DataTypes.JSON,
      allowNull: true
    },
    logistics: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deliveryMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    warranty: {
      type: DataTypes.STRING,
      allowNull: true
    },
    returnPolicy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    weight: {
      type: DataTypes.STRING,
      allowNull: true
    },
    length: {
      type: DataTypes.STRING,
      allowNull: true
    },
    width: {
      type: DataTypes.STRING,
      allowNull: true
    },
    height: {
      type: DataTypes.STRING,
      allowNull: true
    },
    keywords: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shareableLink: {
      type: DataTypes.STRING,
      allowNull: true
    },
    approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reviewStatus: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    visibilityStatus: {
      type: DataTypes.ENUM('visible', 'hidden'),
      defaultValue: 'visible'
    },
    relatedProducts: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deletionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    autoDeleteAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When this record will be permanently deleted (30 days from deletion)'
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['sellerId']
      },
      {
        fields: ['autoDeleteAt']
      },
      {
        fields: ['originalId']
      }
    ]
  });

  DeletedProduct.associate = (models) => {
    DeletedProduct.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });
    DeletedProduct.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'Category'
    });
    DeletedProduct.belongsTo(models.Subcategory, {
      foreignKey: 'subcategoryId',
      as: 'Subcategory'
    });
  };

  return DeletedProduct;
};