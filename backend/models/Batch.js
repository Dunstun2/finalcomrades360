const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Batch = sequelize.define('Batch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        startTime: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Batch start time (HH:MM)'
        },
        endTime: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Batch end time (HH:MM)'
        },
        expectedDelivery: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Expected delivery time (HH:MM)'
        },
        status: {
            type: DataTypes.ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled'),
            defaultValue: 'Scheduled'
        },
        isAutomated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this batch is visible on the customer side'
        }
    }, {
        tableName: 'Batches',
        timestamps: true
    });

    return Batch;
};
