const { Product, Subscription, Plan } = require('../../../database/models.registry');
const BenefitService = require('./BenefitService');
const UsageService = require('./UsageService');

class SellerSubscriptionService {
  /**
   * Helper to validate if a seller is allowed to run an action based on benefits.
   */
  async validateSellerAccess(userId, featureCode) {
    return await BenefitService.hasAccess(userId, featureCode);
  }

  /**
   * Tracks utilization of a plan metric.
   */
  async incrementSellerUsage(userId, featureCode, amount = 1) {
    const sub = await BenefitService.getActiveSubscription(userId);
    if (!sub) throw new Error('No active subscription found for seller');

    return await UsageService.trackUsage(sub.id, featureCode, amount);
  }

  /**
   * Hides all products listed by a seller when their subscription expires or is suspended.
   */
  async suspendSellerBenefits(userId) {
    console.log(`[SellerSub] Suspending active listings for seller: ${userId}`);
    await Product.update(
      { isActive: false },
      { where: { sellerId: userId } }
    );
  }

  /**
   * Restores product listing visibility when a seller upgrades or renews.
   */
  async reactivateSellerBenefits(userId) {
    console.log(`[SellerSub] Reactivating listings for seller: ${userId}`);
    await Product.update(
      { isActive: true },
      { where: { sellerId: userId } }
    );
  }
}

module.exports = new SellerSubscriptionService();
