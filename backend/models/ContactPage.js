// backend/models/ContactPage.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const ContactPage = sequelize.define("ContactPage", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Page Header
    pageTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Get In Touch',
      comment: "Contact page main title"
    },
    pageSubtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Contact page subtitle/description"
    },
    
    // Get In Touch Section
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Contact email address"
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Contact phone number"
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "General location (deprecated - use city/country)"
    },
    availabilityText: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Availability status text"
    },
    
    // Enhanced Location Fields
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Country name"
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "City or town name"
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Street address or area"
    },
    latitude: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "GPS latitude coordinate"
    },
    longitude: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "GPS longitude coordinate"
    },
    
    // Social Media Links - stored as JSON array
    socialMediaLinks: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array of social media links with platform, name, value, type"
    },
    
    // Response Time
    responseTimeText: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'I typically respond within 1-2 business days.',
      comment: "Response time message"
    },
    
    // Google Maps
    googleMapsEmbedUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Google Maps embed URL"
    },
    
    // Audit fields
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

  ContactPage.associate = (models) => {
    ContactPage.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    ContactPage.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return ContactPage;
};
