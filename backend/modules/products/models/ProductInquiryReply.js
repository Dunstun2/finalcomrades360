const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductInquiryReply extends Model {
    static associate(models) {
      ProductInquiryReply.belongsTo(models.ProductInquiry, {
        foreignKey: 'productInquiryId',
        as: 'inquiry'
      });
      ProductInquiryReply.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'sender'
      });
    }
  }

  ProductInquiryReply.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    productInquiryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isAdminReply: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    sequelize,
    modelName: 'ProductInquiryReply',
    tableName: 'ProductInquiryReplies',
    timestamps: true,
  });

  return ProductInquiryReply;
};
