// backend/models/AboutPage.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const AboutPage = sequelize.define("AboutPage", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    brandStory: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Company brand story"
    },
    vision: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Company vision"
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Company mission"
    },
    values: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Company core values"
    },
    additionalInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Additional company information"
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "Admin user who created this content"
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "Admin user who last updated this content"
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['createdBy']
      },
      {
        fields: ['updatedBy']
      }
    ]
  });

  AboutPage.associate = (models) => {
    AboutPage.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    AboutPage.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return AboutPage;
};
