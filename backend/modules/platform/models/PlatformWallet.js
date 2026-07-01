// models/PlatformWallet.js
module.exports = (sequelize, DataTypes) => {
    const PlatformWallet = sequelize.define('PlatformWallet', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        totalEarned: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        totalWithdrawn: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        }
    }, {
        tableName: 'PlatformWallets',
        timestamps: true
    });

    PlatformWallet.associate = (models) => {
        // A platform wallet has many platform transactions
        PlatformWallet.hasMany(models.PlatformTransaction, {
            foreignKey: 'walletId',
            as: 'transactions'
        });
    };

    return PlatformWallet;
};
