// backend/models/BlogComment.js
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

  const BlogComment = sequelize.define("BlogComment", {
    id: idConfig,

    blogPostId: {
      type: foreignKeyType,
      allowNull: false,
      references: {
        model: 'BlogPost',
        key: 'id'
      },
      comment: "Blog post this comment belongs to"
    },

    userId: {
      type: foreignKeyType,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "User who made the comment (null for anonymous)"
    },

    authorName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Commenter's name"
    },

    authorEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Commenter's email (optional)"
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Comment text"
    },

    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'spam'),
      defaultValue: 'approved',
      comment: "Moderation status"
    },

    parentId: {
      type: foreignKeyType,
      allowNull: true,
      references: {
        model: 'BlogComment',
        key: 'id'
      },
      comment: "Parent comment for replies"
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
        fields: ['status']
      },
      {
        fields: ['parentId']
      }
    ]
  });

  BlogComment.associate = (models) => {
    BlogComment.belongsTo(models.BlogPost, {
      foreignKey: 'blogPostId',
      as: 'post'
    });
    BlogComment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    BlogComment.belongsTo(BlogComment, {
      foreignKey: 'parentId',
      as: 'parentComment'
    });
    BlogComment.hasMany(BlogComment, {
      foreignKey: 'parentId',
      as: 'replies'
    });
  };

  return BlogComment;
};
