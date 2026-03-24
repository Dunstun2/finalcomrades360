const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const HandoverCode = sequelize.define('HandoverCode', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(5),
            allowNull: false,
            comment: '5-digit numeric confirmation code'
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'The order this handover is for'
        },
        taskId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'The delivery task this handover is for (if applicable)'
        },
        handoverType: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Type of handover: seller_to_agent | agent_to_warehouse | warehouse_to_agent | agent_to_station | agent_to_customer'
        },
        initiatorId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'User ID of the person who generated the code (the giver). Can be an INTEGER or a synthetic STRING for stations.'
        },
        confirmerId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'User ID of the person who confirmed the code (the receiver). Can be an INTEGER or a synthetic STRING for stations.'
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            comment: 'pending | confirmed | expired'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'When the code expires (1 hour from generation)'
        },
        confirmedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the code was successfully confirmed'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Optional notes recorded at the time of handover'
        },
        autoConfirmAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp for automatic status update to Delivered if code is ignored'
        }
    }, {
        freezeTableName: true,
        timestamps: true
    });

    HandoverCode.associate = function (models) {
        HandoverCode.belongsTo(models.Order, {
            foreignKey: 'orderId',
            as: 'order'
        });
        HandoverCode.belongsTo(models.DeliveryTask, {
            foreignKey: 'taskId',
            as: 'task'
        });
        HandoverCode.belongsTo(models.User, {
            foreignKey: 'initiatorId',
            as: 'initiator'
        });
        HandoverCode.belongsTo(models.User, {
            foreignKey: 'confirmerId',
            as: 'confirmer'
        });
    };

    return HandoverCode;
};
