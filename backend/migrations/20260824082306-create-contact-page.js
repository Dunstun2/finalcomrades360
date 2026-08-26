'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ContactPage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      // Page Header
      pageTitle: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'Get In Touch',
        comment: "Contact page main title"
      },
      pageSubtitle: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Contact page subtitle/description"
      },
      
      // Get In Touch Section
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "Contact email address"
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "Contact phone number"
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "General location (deprecated - use city/country)"
      },
      availabilityText: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Availability status text"
      },
      
      // Enhanced Location Fields
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Country name"
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "City or town name"
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "Street address or area"
      },
      latitude: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "GPS latitude coordinate"
      },
      longitude: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "GPS longitude coordinate"
      },
      
      // Social Media Links - stored as JSON
      socialMediaLinks: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Array of social media links with platform, name, value, type"
      },
      
      // Response Time
      responseTimeText: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'I typically respond within 1-2 business days.',
        comment: "Response time message"
      },
      
      // Google Maps
      googleMapsEmbedUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Google Maps embed URL"
      },
      
      // Audit fields
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        comment: "Admin user who created this content"
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        comment: "Admin user who last updated this content"
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('ContactPage', ['createdBy']);
    await queryInterface.addIndex('ContactPage', ['updatedBy']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ContactPage');
  }
};
