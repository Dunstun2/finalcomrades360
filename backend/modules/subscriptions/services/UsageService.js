const { SubscriptionUsage, Subscription, PlanBenefit } = require('../../../database/models.registry');
const { Op } = require('sequelize');

class UsageService {
  /**
   * Safe getter/initializer for subscription usage.
   */
  async getOrCreateUsage(subscriptionId, featureCode) {
    const sub = await Subscription.findByPk(subscriptionId);
    if (!sub) throw new Error('Subscription not found');

    let usage = await SubscriptionUsage.findOne({
      where: { subscriptionId, featureCode }
    });

    if (!usage) {
      // Find default limit from plan benefits
      const benefit = await PlanBenefit.findOne({
        where: { planId: sub.planId, featureCode }
      });

      const limitValue = benefit && benefit.value && typeof benefit.value.limit !== 'undefined' 
        ? parseInt(benefit.value.limit) 
        : -1; // -1 means unlimited

      usage = await SubscriptionUsage.create({
        subscriptionId,
        featureCode,
        quantityUsed: 0,
        quantityLimit: limitValue,
        lastResetDate: new Date()
      });
    }

    return usage;
  }

  /**
   * Tracks/Increments usage. Throws if limit is reached.
   */
  async trackUsage(subscriptionId, featureCode, amount = 1) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode);

    // If unlimited, just increment
    if (usage.quantityLimit === -1) {
      usage.quantityUsed += amount;
      await usage.save();
      return usage;
    }

    if (usage.quantityUsed + amount > usage.quantityLimit) {
      throw new Error(`Usage limit reached for feature: ${featureCode}`);
    }

    usage.quantityUsed += amount;
    await usage.save();
    return usage;
  }

  /**
   * Gets remaining uses.
   */
  async getRemaining(subscriptionId, featureCode) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode);
    if (usage.quantityLimit === -1) {
      return Infinity; // Unlimited
    }
    return Math.max(0, usage.quantityLimit - usage.quantityUsed);
  }

  /**
   * Resets usage counters.
   */
  async resetUsage(subscriptionId, featureCode) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode);
    usage.quantityUsed = 0;
    usage.lastResetDate = new Date();
    await usage.save();
  }
}

module.exports = new UsageService();
