const { SubscriptionUsage, Subscription, PlanBenefit, Plan } = require('../../../database/models.registry');
const { Op } = require('sequelize');
 
class UsageService {
  /**
   * Safe getter/initializer for subscription usage.
   */
  async getOrCreateUsage(subscriptionId, featureCode, options = {}) {
    const sub = await Subscription.findByPk(subscriptionId, {
      include: [{ model: Plan, as: 'plan' }],
      transaction: options.transaction
    });
    if (!sub) throw new Error('Subscription not found');
 
    let usage = await SubscriptionUsage.findOne({
      where: { subscriptionId, featureCode },
      transaction: options.transaction
    });
 
    if (!usage) {
      // Find default limit from plan benefits (or benefit package)
      const BenefitService = require('../services/BenefitService');
      const benefit = await BenefitService.getActiveBenefit(sub, featureCode);
 
      const limitValue = benefit && benefit.value && typeof benefit.value.limit !== 'undefined' 
        ? parseInt(benefit.value.limit) 
        : -1; // -1 means unlimited
 
      usage = await SubscriptionUsage.create({
        subscriptionId,
        featureCode,
        quantityUsed: 0,
        quantityLimit: limitValue,
        lastResetDate: new Date()
      }, { transaction: options.transaction });
    }

    return usage;
  }

  /**
   * Tracks/Increments usage. Throws if limit is reached.
   */
  async trackUsage(subscriptionId, featureCode, amount = 1, options = {}) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode, options);

    // If unlimited, just increment
    if (usage.quantityLimit === -1) {
      usage.quantityUsed += amount;
      await usage.save({ transaction: options.transaction });
      return usage;
    }

    if (usage.quantityUsed + amount > usage.quantityLimit) {
      throw new Error(`Usage limit reached for feature: ${featureCode}`);
    }

    usage.quantityUsed += amount;
    await usage.save({ transaction: options.transaction });
    return usage;
  }

  /**
   * Gets remaining uses.
   */
  async getRemaining(subscriptionId, featureCode, options = {}) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode, options);
    if (usage.quantityLimit === -1) {
      return Infinity; // Unlimited
    }
    return Math.max(0, usage.quantityLimit - usage.quantityUsed);
  }

  /**
   * Resets usage counters.
   */
  async resetUsage(subscriptionId, featureCode, options = {}) {
    const usage = await this.getOrCreateUsage(subscriptionId, featureCode, options);
    usage.quantityUsed = 0;
    usage.lastResetDate = new Date();
    await usage.save({ transaction: options.transaction });
  }
}

module.exports = new UsageService();
