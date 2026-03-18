const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const PickupStation = sequelize.define('PickupStation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        location: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        operatingHours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            comment: 'Delivery fee to this station'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        lat: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            comment: 'Latitude of the pickup station'
        },
        lng: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            comment: 'Longitude of the pickup station'
        }
    }, {
        timestamps: true
    });

    return PickupStation;
};
