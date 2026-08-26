const { Product, FastFood, Subscription, Plan, PlanBenefit, Feature, sequelize } = require('../../../database/models.registry');
const { Op } = require('sequelize');
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

  // ─── Internal: resolve the raw numeric limit for a feature ────────────────

  /**
   * @private
   * Traverses all active seller subscriptions for a user and finds the
   * maximum numeric `limit` value for a given featureCode.
   * Returns the limit (number) or null if the feature is not part of any plan.
   */
  async _resolveNumericLimit(userId, featureCode) {
    const activeSubs = await Subscription.findAll({
      where: { userId, status: ['Active', 'Trial'] },
      include: [{
        model: Plan,
        as: 'plan',
        include: [{
          model: PlanBenefit,
          as: 'benefits',
          include: [{ model: Feature, as: 'feature' }]
        }]
      }]
    });

    let limit = null;
    for (const sub of activeSubs) {
      if (sub.plan?.type !== 'seller') continue;
      const benefit = (sub.plan.benefits || []).find(b => b.feature?.code === featureCode);
      if (benefit) {
        const val = benefit.value?.limit;
        if (val && val > 0) {
          limit = Math.max(limit || 0, val);
        }
      }
    }
    return limit;
  }

  /**
   * @private
   * Returns true if any active seller subscription contains the given feature
   * (regardless of limitType / value).
   */
  async _hasBooleanFeature(userId, featureCode) {
    const activeSubs = await Subscription.findAll({
      where: { userId, status: ['Active', 'Trial'] },
      include: [{
        model: Plan,
        as: 'plan',
        include: [{
          model: PlanBenefit,
          as: 'benefits',
          include: [{ model: Feature, as: 'feature' }]
        }]
      }]
    });

    for (const sub of activeSubs) {
      if (sub.plan?.type !== 'seller') continue;
      const found = (sub.plan.benefits || []).some(b => b.feature?.code === featureCode);
      if (found) return true;
    }
    return false;
  }

  // ─── Public quota helpers ─────────────────────────────────────────────────

  /**
   * Checks the `max_products` quota for a seller.
   * Throws a structured error if the limit is exceeded.
   * Only enforces when the seller has an active plan with this limit set.
   *
   * @param {number} userId  - The seller's userId
   * @param {'product'|'fastfood'} itemType - Which model to count against
   */
  async checkProductLimit(userId, itemType = 'product') {
    const maxProductsLimit = await this._resolveNumericLimit(userId, 'max_products');
    if (maxProductsLimit === null) return; // No limit configured — allow

    let currentCount;
    if (itemType === 'fastfood') {
      currentCount = await FastFood.count({
        where: { vendor: userId, reviewStatus: { [Op.ne]: 'deleted' } }
      });
    } else {
      currentCount = await Product.count({
        where: { sellerId: userId, status: { [Op.ne]: 'deleted' } }
      });
    }

    if (currentCount >= maxProductsLimit) {
      const err = new Error(
        `Your subscription plan allows a maximum of ${maxProductsLimit} products. ` +
        `You currently have ${currentCount}. Please upgrade your plan to list more products.`
      );
      err.code = 'PRODUCT_LIMIT_REACHED';
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Checks the `max_categories` quota for a seller.
   * Counts distinct categoryIds across BOTH Product and FastFood.
   * Throws a structured error if adding a new category would exceed the limit.
   *
   * @param {number} userId     - The seller's userId
   * @param {number} categoryId - The category the seller is trying to list in
   */
  async checkCategoryLimit(userId, categoryId) {
    if (!categoryId) return;

    const maxCategoriesLimit = await this._resolveNumericLimit(userId, 'max_categories');
    if (maxCategoriesLimit === null) return; // No limit configured — allow

    const [productCats, foodCats] = await Promise.all([
      Product.findAll({
        where: { sellerId: userId, status: { [Op.ne]: 'deleted' } },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('categoryId')), 'categoryId']],
        raw: true
      }),
      FastFood.findAll({
        where: { vendor: userId, reviewStatus: { [Op.ne]: 'deleted' } },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('categoryId')), 'categoryId']],
        raw: true
      })
    ]);

    const activeCategories = new Set(
      [...productCats, ...foodCats].map(c => c.categoryId).filter(Boolean)
    );

    if (!activeCategories.has(Number(categoryId)) && activeCategories.size >= maxCategoriesLimit) {
      const err = new Error(
        `Your subscription plan allows a maximum of ${maxCategoriesLimit} product categories. ` +
        `You are already listing items in ${activeCategories.size} categories. Please upgrade your plan.`
      );
      err.code = 'CATEGORY_LIMIT_REACHED';
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Checks the `boosted_products` quota for a seller across both Products and FastFood.
   * Throws a structured error if the limit is reached.
   *
   * @param {number} userId           - The seller's userId
   * @param {object} [opts]
   * @param {number} [opts.excludeProductId] - Product ID to exclude from boosted count
   * @param {number} [opts.excludeFoodId]    - FastFood ID to exclude from boosted count
   */
  async checkBoostLimit(userId, { excludeProductId = null, excludeFoodId = null } = {}) {
    const boostLimit = await this._resolveNumericLimit(userId, 'boosted_products');
    if (boostLimit === null) {
      const err = new Error('Your plan does not support boosting items. Please upgrade your subscription.');
      err.code = 'BOOST_NOT_ALLOWED';
      err.statusCode = 403;
      throw err;
    }

    const productWhere = { sellerId: userId, isBoosted: true };
    if (excludeProductId) productWhere.id = { [Op.ne]: excludeProductId };

    const foodWhere = { vendor: userId, isBoosted: true };
    if (excludeFoodId) foodWhere.id = { [Op.ne]: excludeFoodId };

    const [productCount, foodCount] = await Promise.all([
      Product.count({ where: productWhere }),
      FastFood.count({ where: foodWhere })
    ]);
    const totalBoosted = productCount + foodCount;

    if (totalBoosted >= boostLimit) {
      const err = new Error(
        `Boosted item limit reached. Your plan allows boosting up to ${boostLimit} items. ` +
        `Currently boosted: ${totalBoosted}.`
      );
      err.code = 'BOOST_LIMIT_REACHED';
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Confirms the seller has the `featured_product` boolean benefit.
   * Throws a structured error if not.
   *
   * @param {number} userId - The seller's userId
   */
  async checkFeatureAccess(userId) {
    const hasFeature = await this._hasBooleanFeature(userId, 'featured_product');
    if (!hasFeature) {
      const err = new Error(
        'Your plan does not support featuring items on the Hero banner. Please upgrade your subscription.'
      );
      err.code = 'FEATURE_NOT_ALLOWED';
      err.statusCode = 403;
      throw err;
    }
  }

  // ─── Suspend / Reactivate ────────────────────────────────────────────────

  /**
   * Hides all products AND fast food listings for a seller when their
   * subscription expires or is suspended.
   */
  async suspendSellerBenefits(userId) {
    console.log(`[SellerSub] Suspending active listings for seller: ${userId}`);
    await Promise.all([
      Product.update({ isActive: false }, { where: { sellerId: userId } }),
      FastFood.update({ isActive: false }, { where: { vendor: userId } })
    ]);
  }

  /**
   * Restores product AND fast food listing visibility when a seller upgrades or renews.
   */
  async reactivateSellerBenefits(userId) {
    console.log(`[SellerSub] Reactivating listings for seller: ${userId}`);
    await Promise.all([
      Product.update({ isActive: true }, { where: { sellerId: userId } }),
      FastFood.update({ isActive: true }, { where: { vendor: userId } })
    ]);
  }
}

module.exports = new SellerSubscriptionService();
