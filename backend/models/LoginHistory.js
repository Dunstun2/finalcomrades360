const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class LoginHistory extends Model { }

    LoginHistory.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        browser: {
            type: DataTypes.STRING,
            allowNull: true
        },
        device: {
            type: DataTypes.STRING,
            allowNull: true
        },
        os: {
            type: DataTypes.STRING,
            allowNull: true
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('success', 'failed'),
            defaultValue: 'success'
        }
    }, {
        sequelize,
        modelName: 'LoginHistory',
        tableName: 'LoginHistory',
        timestamps: true,
        updatedAt: false // We only care about creation time (login time)
    });

    LoginHistory.associate = function (models) {
        LoginHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return LoginHistory;
};
