const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContactReply extends Model {
    static associate(models) {
      ContactReply.belongsTo(models.ContactMessage, {
        foreignKey: 'contactMessageId',
        as: 'message'
      });
      ContactReply.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'sender'
      });
    }
  }

  ContactReply.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contactMessageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: 'ContactReply',
    tableName: 'ContactReplies',
    timestamps: true,
  });

  return ContactReply;
};
