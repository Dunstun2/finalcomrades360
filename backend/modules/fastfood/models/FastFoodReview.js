const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const FastFoodReview = sequelize.define('FastFoodReview', {
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        fastFoodId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'FastFoodReviews',
        timestamps: true
    });

    return FastFoodReview;
};
