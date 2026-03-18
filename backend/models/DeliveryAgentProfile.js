const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const DeliveryAgentProfile = sequelize.define('DeliveryAgentProfile', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    location: { type: DataTypes.STRING, allowNull: true, comment: 'Primary working location/area' },
    // store as JSON string: { days: ['mon','tue',...], from: '08:00', to: '17:00' }
    availability: { type: DataTypes.TEXT, allowNull: true, comment: 'Work schedule as JSON' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Whether agent is currently active' },
    vehicleType: { type: DataTypes.STRING, allowNull: true, comment: 'Type of vehicle (Walking, Bicycle, Motorcycle, etc.)' },
    vehiclePlate: { type: DataTypes.STRING, allowNull: true, comment: 'Vehicle registration/plate number' },
    maxLoadCapacity: { type: DataTypes.FLOAT, allowNull: true, comment: 'Maximum load capacity in kg' },
    currentLocation: { type: DataTypes.TEXT, allowNull: true, comment: 'Current GPS location as JSON {lat, lng, timestamp}' },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'Average rating (0-5)' },
    completedDeliveries: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Total number of completed deliveries' },
    totalEarnings: { type: DataTypes.FLOAT, defaultValue: 0, comment: 'Total earnings from deliveries' },
    licenseNumber: { type: DataTypes.STRING, allowNull: true, comment: 'Driver license number' },
    emergencyContact: { type: DataTypes.STRING, allowNull: true, comment: 'Emergency contact phone number' },

    // Personal & Documents
    profilePhoto: { type: DataTypes.STRING, allowNull: true, comment: 'URL to profile photo' },
    idDocument: { type: DataTypes.STRING, allowNull: true, comment: 'URL to ID/License document' },
    backgroundCheckStatus: { type: DataTypes.STRING, defaultValue: 'pending' },

    // Extended Vehicle Details
    vehicleModel: { type: DataTypes.STRING, allowNull: true },
    vehicleColor: { type: DataTypes.STRING, allowNull: true },
    vehiclePhoto: { type: DataTypes.STRING, allowNull: true, comment: 'URL to vehicle photo' },
    insuranceDocument: { type: DataTypes.STRING, allowNull: true, comment: 'URL to insurance document' },
    insuranceExpiry: { type: DataTypes.DATE, allowNull: true },
    inspectionCertificate: { type: DataTypes.STRING, allowNull: true, comment: 'URL to inspection certificate' },

    // Payment Settings
    bankName: { type: DataTypes.STRING, allowNull: true },
    accountNumber: { type: DataTypes.STRING, allowNull: true },
    accountName: { type: DataTypes.STRING, allowNull: true },
    mobileMoneyNumber: { type: DataTypes.STRING, allowNull: true },
    mobileMoneyProvider: { type: DataTypes.STRING, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, defaultValue: 'mobile_money' },

    // Performance Metrics
    acceptanceRate: { type: DataTypes.FLOAT, defaultValue: 100 },
    completionRate: { type: DataTypes.FLOAT, defaultValue: 100 },
    onTimeRate: { type: DataTypes.FLOAT, defaultValue: 100 },

    // Preferences
    preferredZones: { type: DataTypes.TEXT, allowNull: true, comment: 'Array of strings stored as JSON' }, // Array of strings
    maxDeliveryDistance: { type: DataTypes.FLOAT, defaultValue: 10 }, // km
    notificationSettings: { type: DataTypes.TEXT, defaultValue: JSON.stringify({ newOrder: true, statusUpdate: true, promotional: false }), comment: 'Notification preferences stored as JSON' }
  }, { freezeTableName: true, timestamps: true });

  DeliveryAgentProfile.associate = function (models) {
    DeliveryAgentProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return DeliveryAgentProfile;
};
