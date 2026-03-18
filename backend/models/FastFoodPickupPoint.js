const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const FastFoodPickupPoint = sequelize.define('FastFoodPickupPoint', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        contactName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveryFee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'FastFoodPickupPoint',
        freezeTableName: true,
        timestamps: true
    });

    return FastFoodPickupPoint;
};
