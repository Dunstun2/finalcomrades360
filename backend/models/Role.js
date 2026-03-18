const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
            comment: 'Role slug (e.g., manager, premium_seller)'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        accessLevels: {
            type: DataTypes.JSON,
            defaultValue: {
                marketplace: true,
                sellerPortal: false,
                marketingTools: false,
                commissionAccess: false,
                adminPanel: false,
                dashboard: false
            },
            comment: 'Section-based access control'
        },
        permissions: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'Array of specific permission strings'
        },
        isSystem: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'If true, role cannot be deleted'
        }
    }, {
        tableName: 'Roles',
        timestamps: true
    });

    Role.associate = (models) => {
        Role.hasMany(models.User, {
            foreignKey: 'role',
            sourceKey: 'id',
            as: 'users'
        });
    };

    return Role;
};
