// backend/models/BlogLike.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const BlogLike = sequelize.define("BlogLike", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    blogPostId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'BlogPost',
        key: 'id'
      },
      comment: "Blog post that was liked"
    },
    
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "User who liked (null for anonymous)"
    },
    
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "IP address for anonymous likes"
    },
    
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Browser user agent"
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
        name: 'unique_post_user_like'
      },
      {
        fields: ['blogPostId', 'ipAddress'],
        name: 'post_ip_like'
      }
    ]
  });

  BlogLike.associate = (models) => {
    BlogLike.belongsTo(models.BlogPost, {
      foreignKey: 'blogPostId',
      as: 'post'
    });
    BlogLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return BlogLike;
};
