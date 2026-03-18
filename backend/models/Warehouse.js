module.exports = (sequelize, DataTypes) => {
    const Warehouse = sequelize.define('Warehouse', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Warehouse name (e.g., Main Warehouse, Nairobi Central)'
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true,
            comment: 'Unique warehouse code for identification'
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Full physical address'
        },
        county: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'County location'
        },
        town: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Town/City'
        },
        landmark: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Nearby landmark for easier location'
        },
        contactPerson: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Warehouse manager or contact person name'
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Contact phone number'
        },
        contactEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Contact email address'
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Storage capacity in cubic meters or items'
        },
        operatingHours: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Operating hours (e.g., Mon-Fri 8AM-5PM)'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether warehouse is currently active/operational'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes or instructions'
        },
        lat: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            comment: 'Latitude of the warehouse'
        },
        lng: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            comment: 'Longitude of the warehouse'
        }
    }, {
        tableName: 'Warehouse',
        timestamps: true
    });

    return Warehouse;
};
