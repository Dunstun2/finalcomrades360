const { Subscription, Plan, PlanBenefit, Feature, PackageBenefit } = require('../../../database/models.registry');
const { Op } = require('sequelize');

class BenefitService {
  /**
   * Resolves the active subscription for a user.
   * Caches or retrieves active states ('Trial', 'Active', 'Grace').
   */
  async getActiveSubscription(userId) {
    return await Subscription.findOne({
      where: {
        userId,
        status: ['Trial', 'Active', 'Grace']
      },
      include: [{
        model: Plan,
        as: 'plan'
      }]
    });
  }

  /**
   * Resolves the current benefit record for an active subscription.
   * Accounts for temporal benefit overrides (start/end dates).
   */
  async getActiveBenefit(subscription, featureCode) {
    if (!subscription || !subscription.planId) return null;

    const now = new Date();

    // Query benefits for this plan specifically (overrides)
    let benefit = await PlanBenefit.findOne({
      where: {
        planId: subscription.planId,
        featureCode,
        [Op.or]: [
          {
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
          },
          {
            startDate: null,
            endDate: null
          }
        ]
      }
    });

    if (!benefit && subscription.plan && subscription.plan.benefitPackageId) {
      // Query from the attached benefit package
      benefit = await PackageBenefit.findOne({
        where: {
          packageId: subscription.plan.benefitPackageId,
          featureCode,
          [Op.or]: [
            {
              startDate: { [Op.lte]: now },
              endDate: { [Op.gte]: now }
            },
            {
              startDate: null,
              endDate: null
            }
          ]
        }
      });
    }

    return benefit;
  }

  /**
   * Checks if a user has access to a specific feature.
   */
  async hasAccess(userId, featureCode) {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return false;

    const benefit = await this.getActiveBenefit(sub, featureCode);
    if (!benefit) return false;

    // For boolean feature check, if limitType is boolean, return value is true
    if (benefit.limitType === 'boolean') {
      return !!benefit.value.enabled;
    }

    return true; // Counter or rate features imply access exists
  }

  /**
   * Gets the numerical value or limit configuration for a feature.
   */
  async getBenefitValue(userId, featureCode) {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return null;

    const benefit = await this.getActiveBenefit(sub, featureCode);
    if (!benefit) return null;

    return benefit.value;
  }
}

module.exports = new BenefitService();
