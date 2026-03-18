const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const JobOpening = sequelize.define("JobOpening", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        role: {
            type: DataTypes.ENUM('seller', 'marketer', 'delivery_agent', 'service_provider'),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        requirements: {
            type: DataTypes.TEXT, // Can store as JSON string or plain text
            allowNull: true
        },
        targetCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        status: {
            type: DataTypes.ENUM('active', 'closed', 'filled'),
            defaultValue: 'active'
        },
        deadline: {
            type: DataTypes.DATE,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true, // In case user is deleted
            references: {
                model: 'User',
                key: 'id'
            }
        }
    }, {
        timestamps: true,
        paranoid: true // Soft deletes
    });

    JobOpening.associate = (models) => {
        JobOpening.hasMany(models.RoleApplication, {
            foreignKey: 'jobOpeningId',
            as: 'applications'
        });
        JobOpening.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });
    };

    return JobOpening;
};
