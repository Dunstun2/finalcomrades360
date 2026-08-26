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
    // Cost Projection Snapshot - stores the exact Schedule & Projected Cost table
    // as calculated at subscription creation time (for customer display)
    costProjectionSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stores the pre-calculated cost breakdown table data including delivery fees, benefits, and totals'
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
    },
    // Subscription lifecycle fields
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When subscription was activated after payment verification'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When subscription was cancelled'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for subscription cancellation'
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

    // Allow multiple subscriptions of the same type per user.
    // Customers may purchase plans for others or maintain multiple schedules.
  });

  return Subscription;
};
