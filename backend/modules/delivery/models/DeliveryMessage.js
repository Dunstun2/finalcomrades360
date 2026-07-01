const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const DeliveryMessage = sequelize.define('DeliveryMessage', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Associated order'
        },
        senderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'User ID of the sender'
        },
        receiverId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'User ID of the receiver'
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'text', // text, image, system
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: true
    });

    DeliveryMessage.associate = function (models) {
        DeliveryMessage.belongsTo(models.Order, {
            foreignKey: 'orderId',
            as: 'order'
        });
        DeliveryMessage.belongsTo(models.User, {
            foreignKey: 'senderId',
            as: 'sender'
        });
        DeliveryMessage.belongsTo(models.User, {
            foreignKey: 'receiverId',
            as: 'receiver'
        });
    };

    return DeliveryMessage;
};
