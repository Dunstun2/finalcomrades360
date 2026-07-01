const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const KnownLocation = sequelize.define('KnownLocation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    radius: { type: DataTypes.FLOAT, defaultValue: 150, comment: 'Radius in meters to consider "at" this location' },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 1 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Whether it has reached the threshold to be "smart"' },
    category: { type: DataTypes.ENUM('residential', 'commercial', 'landmark', 'other'), defaultValue: 'other' }
  }, {
    indexes: [
      { fields: ['lat', 'lng'] },
      { fields: ['name'] }
    ]
  });

  return KnownLocation;
};
