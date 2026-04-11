// models/PlatformTransaction.js
module.exports = (sequelize, DataTypes) => {
    const PlatformTransaction = sequelize.define('PlatformTransaction', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        walletId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('credit', 'debit'),
            allowNull: false
        },
        sourceType: {
            // Tells us where it came from: 'item_sale', 'delivery_share', 'withdrawal_fee', 'platform_withdrawal'
            type: DataTypes.STRING,
            allowNull: false
        },
        referenceId: {
            // ID of the related order, delivery task, or user withdrawal transaction
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('metadata');
                if (!rawValue) return {};
                try {
                    return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
                } catch (e) {
                    return {};
                }
            },
            set(value) {
                if (typeof value === 'object') {
                    this.setDataValue('metadata', JSON.stringify(value));
                } else {
                    this.setDataValue('metadata', value);
                }
            }
        }
    }, {
        tableName: 'PlatformTransactions',
        timestamps: true
    });

    PlatformTransaction.associate = (models) => {
        PlatformTransaction.belongsTo(models.PlatformWallet, {
            foreignKey: 'walletId',
            as: 'wallet'
        });
        // We could also add polymorphic associations here if needed, but referenceId + sourceType usually suffices.
    };

    return PlatformTransaction;
};
