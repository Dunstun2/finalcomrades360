const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const DeliveryTask = sequelize.define('DeliveryTask', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Reference to the order being delivered'
        },
        deliveryAgentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Delivery agent assigned to this task'
        },
        deliveryType: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            comment: 'Type of delivery route'
        },
        pickupLocation: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Address/location for pickup (warehouse, customer, or seller address)'
        },
        deliveryLocation: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Address/location for delivery'
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'assigned',
            comment: 'Current status of the delivery task'
        },
        assignedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the task was assigned to an agent'
        },
        acceptedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the agent accepted the task'
        },
        arrivedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the agent arrived at the pickup location'
        },
        collectedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the agent confirmed collection at pickup location'
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the agent started the delivery'
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the delivery was completed'
        },
        estimatedDeliveryTime: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Estimated delivery completion time'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes or instructions for the delivery'
        },
        agentNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Notes added by the delivery agent during/after delivery'
        },
        failureReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason for failed delivery'
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason for task rejection by agent'
        },
        proofOfDelivery: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL to proof of delivery image/signature'
        },
        currentLocation: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Last known location during delivery (JSON: {lat, lng, timestamp})'
        },
        distanceKm: {
            type: DataTypes.FLOAT,
            allowNull: true,
            comment: 'Calculated distance in kilometers'
        },
        deliveryFee: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0,
            comment: 'Delivery fee for this task'
        },
        agentEarnings: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0,
            comment: 'Agent earnings from this delivery'
        },
        agentShare: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0,
            comment: 'Locked agent share percentage at the time of assignment'
        },
        systemRevenueClaimed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether the platform system revenue share has been collected'
        },
        systemRevenueClaimedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the system revenue was collected'
        },
        systemRevenueAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0,
            comment: 'The platform system share amount collected from this task'
        }

    }, {
        freezeTableName: true,
        timestamps: true
    });

    DeliveryTask.associate = function (models) {
        // Task belongs to an order
        DeliveryTask.belongsTo(models.Order, {
            foreignKey: 'orderId',
            as: 'order'
        });

        // Task belongs to a delivery agent (User) — two aliases for flexibility
        DeliveryTask.belongsTo(models.User, {
            foreignKey: 'deliveryAgentId',
            as: 'deliveryAgent'
        });
        DeliveryTask.belongsTo(models.User, {
            foreignKey: 'deliveryAgentId',
            as: 'agent'
        });
    };

    return DeliveryTask;
};
