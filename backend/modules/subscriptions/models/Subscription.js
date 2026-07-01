const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Subscription.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
      Subscription.hasMany(models.SubscriptionUsage, { foreignKey: 'subscriptionId', as: 'usages' });
      Subscription.hasMany(models.MealSchedule, { foreignKey: 'subscriptionId', as: 'schedules' });
      Subscription.hasMany(models.MealOccurrence, { foreignKey: 'subscriptionId', as: 'occurrences' });
      Subscription.hasMany(models.SubscriptionInvoice, { foreignKey: 'subscriptionId', as: 'invoices' });
      Subscription.hasMany(models.SubscriptionEvent, { foreignKey: 'subscriptionId', as: 'events' });
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for custom subscriptions that don't use predefined plans
      references: {
        model: 'Plan',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Trial', 'Active', 'Grace', 'Past Due', 'Paused', 'Expired', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    renewalDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Custom Pricing
    customPrice: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // Guest Stateless Checkout Fields
    guestName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestDeliveryAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    guestManageToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Subscription',
    freezeTableName: true,
    timestamps: true
  });

  // Enforce unique concurrent active/grace/trial subscription per plan type for a user
  Subscription.addHook('beforeSave', async (subscription, options) => {
    const activeStatuses = ['Trial', 'Active', 'Grace', 'Past Due'];
    if (!activeStatuses.includes(subscription.status)) {
      return;
    }

    const Plan = sequelize.models.Plan;
    let planType = 'meal'; // Default for custom subscriptions without planId

    if (subscription.planId) {
      const plan = await Plan.findByPk(subscription.planId, { transaction: options.transaction });
      if (!plan) {
        throw new Error('Associated plan not found');
      }
      planType = plan.type;
    }

    // Skip validation for guest checkouts since guest subscriptions are not bound to a user account
    if (!subscription.userId) {
      return;
    }

    const { Op } = require('sequelize');
    const existingActive = await Subscription.findOne({
      where: {
        userId: subscription.userId,
        status: activeStatuses,
        id: { [Op.ne]: subscription.id }
      },
      include: [{
        model: Plan,
        as: 'plan',
        required: false // Custom plans might not have a plan template joined
      }],
      transaction: options.transaction
    });

    if (existingActive) {
      // If the existing subscription is standard (has plan) and matches type, or if we are verifying meal type
      const existingType = existingActive.plan ? existingActive.plan.type : 'meal';
      if (existingType === planType) {
        throw new Error(`User already has an active subscription of type '${planType}'`);
      }
    }
  });

  return Subscription;
};
