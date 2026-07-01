const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    referrerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    referredUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    referralCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    rewardEarned: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    firstOrderCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'Referrals'
  });

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, {
      as: 'referrer',
      foreignKey: 'referrerId'
    });
    Referral.belongsTo(models.User, {
      as: 'referredUser',
      foreignKey: 'referredUserId'
    });
  };

  return Referral;
};
