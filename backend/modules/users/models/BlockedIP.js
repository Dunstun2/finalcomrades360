const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class BlockedIP extends Model { }

    BlockedIP.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true
        },
        blockedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true // Null means permanent
        }
    }, {
        sequelize,
        modelName: 'BlockedIP',
        tableName: 'BlockedIP',
        timestamps: true
    });

    BlockedIP.associate = function (models) {
        BlockedIP.belongsTo(models.User, { foreignKey: 'blockedBy', as: 'admin' });
    };

    return BlockedIP;
};
