const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContactMessage extends Model {
    static associate(models) {
      ContactMessage.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        constraints: false,
      });
      ContactMessage.hasMany(models.ContactReply, {
        foreignKey: 'contactMessageId',
        as: 'replies'
      });
    }
  }

  ContactMessage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // No hard FK references - allows guest submissions and avoids dialect issues
    },
    status: {
      type: DataTypes.ENUM('pending', 'replied', 'closed'),
      defaultValue: 'pending',
    },
    adminResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ContactMessage',
    tableName: 'ContactMessages',
    timestamps: true,
  });

  return ContactMessage;
};
