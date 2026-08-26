'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BlogPost', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      featuredImage: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      authorName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      authorAvatar: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      readingTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 5
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft'
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      metaTitle: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      metaDescription: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('BlogPost', ['slug'], {
      unique: true,
      name: 'blog_post_slug_unique'
    });
    await queryInterface.addIndex('BlogPost', ['status']);
    await queryInterface.addIndex('BlogPost', ['publishedAt']);
    await queryInterface.addIndex('BlogPost', ['isFeatured']);
    await queryInterface.addIndex('BlogPost', ['category']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BlogPost');
  }
};
