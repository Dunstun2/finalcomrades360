// backend/models/BlogRating.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const idConfig = isProduction ? {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  } : {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  };

  const foreignKeyType = isProduction ? DataTypes.INTEGER : DataTypes.UUID;

  const BlogRating = sequelize.define("BlogRating", {
    id: idConfig,

    blogPostId: {
      type: foreignKeyType,
      allowNull: false,
      references: {
        model: 'BlogPost',
        key: 'id'
      },
      comment: "Blog post that was rated"
    },

    userId: {
      type: foreignKeyType,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "User who rated (null for anonymous)"
    },

    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      },
      comment: "Rating value (1-5 stars)"
    },

    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "IP address for anonymous ratings"
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['blogPostId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['blogPostId', 'userId'],
        unique: true,
        name: 'unique_post_user_rating'
      },
      {
        fields: ['blogPostId', 'ipAddress'],
        name: 'post_ip_rating'
      }
    ]
  });

  BlogRating.associate = (models) => {
    BlogRating.belongsTo(models.BlogPost, {
      foreignKey: 'blogPostId',
      as: 'post'
    });
    BlogRating.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return BlogRating;
};
