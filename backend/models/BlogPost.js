// backend/models/BlogPost.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const BlogPost = sequelize.define("BlogPost", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Basic Info
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Blog post title"
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: "URL-friendly slug"
    },

    // Featured Image
    featuredImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Featured image URL"
    },

    // Author Info
    authorName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Author display name"
    },
    authorAvatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Author avatar/profile image URL"
    },

    // Reading Info
    readingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
      comment: "Estimated reading time in minutes"
    },

    // Content
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Brief summary/excerpt for card display"
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: "Full blog post content (HTML supported)"
    },

    // Status & Publishing
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
      comment: "Publication status"
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date/time when published"
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Show as featured post"
    },

    // SEO
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "SEO meta title"
    },
    metaDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "SEO meta description"
    },

    // Categories/Tags
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Blog category"
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array of tags"
    },

    // Analytics
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of views"
    },

    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "Admin user who created this post"
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      },
      comment: "Admin user who last updated this post"
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['slug'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['publishedAt']
      },
      {
        fields: ['isFeatured']
      },
      {
        fields: ['category']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  BlogPost.associate = (models) => {
    BlogPost.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    BlogPost.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
    BlogPost.hasMany(models.BlogComment, {
      foreignKey: 'blogPostId',
      as: 'comments'
    });
    BlogPost.hasMany(models.BlogLike, {
      foreignKey: 'blogPostId',
      as: 'likes'
    });
    BlogPost.hasMany(models.BlogRating, {
      foreignKey: 'blogPostId',
      as: 'ratings'
    });
  };

  return BlogPost;
};
