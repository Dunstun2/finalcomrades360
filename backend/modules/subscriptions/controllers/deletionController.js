/**
 * Deletion Controller for Plans and Benefit Packages
 * 
 * Handles safe deletion with proper validation rules:
 * - Plans: Can only be deleted if no active subscriptions exist
 * - Packages: Can only be deleted if not used by any plan
 */

const { Plan, Subscription, BenefitPackage, PlanBenefit, PackageBenefit, sequelize } = require('../../../database/models.registry');

class DeletionController {
  /**
   * Delete a Plan Template
   * 
   * Rules:
   * 1. Cannot delete if there are ANY subscriptions (active, expired, cancelled) using this plan
   * 2. Draft plans can always be deleted
   * 3. Published/Archived plans need subscription check
   * 4. Deletes associated plan benefits automatically (cascade)
   */
  async deletePlan(req, res) {
    const { id } = req.params;

    try {
      const plan = await Plan.findByPk(id, {
        include: [
          { model: Subscription, as: 'subscriptions' }
        ]
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Check if plan has any subscriptions
      const subscriptionCount = await Subscription.count({ where: { planId: id } });

      if (subscriptionCount > 0) {
        const activeCount = await Subscription.count({
          where: {
            planId: id,
            status: ['Trial', 'Active', 'Grace', 'Past Due']
          }
        });

        return res.status(400).json({
          error: 'Cannot delete plan with existing subscriptions',
          details: {
            totalSubscriptions: subscriptionCount,
            activeSubscriptions: activeCount,
            message: activeCount > 0
              ? `This plan has ${activeCount} active subscription(s). Please cancel or migrate them first.`
              : `This plan has ${subscriptionCount} past subscription(s). Deleting would break historical records.`,
            suggestion: 'Consider archiving the plan instead of deleting it.'
          }
        });
      }

      // Safe to delete
      await sequelize.transaction(async (t) => {
        // Delete plan benefits (cascade)
        await PlanBenefit.destroy({ where: { planId: id }, transaction: t });

        // Delete the plan
        await plan.destroy({ transaction: t });
      });

      return res.status(200).json({
        message: 'Plan deleted successfully',
        planId: id,
        planName: plan.name
      });

    } catch (error) {
      console.error('Error deleting plan:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete plan' });
    }
  }

  /**
   * Delete a Benefit Package
   * 
   * Rules:
   * 1. Cannot delete if any published plan is using this package
   * 2. Draft plans using this package will have benefitPackageId set to null
   * 3. Cannot delete if active subscriptions have this package through their plan
   * 4. Deletes associated package benefits automatically (cascade)
   */
  async deleteBenefitPackage(req, res) {
    const { id } = req.params;

    try {
      const pkg = await BenefitPackage.findByPk(id, {
        include: [
          { model: Plan, as: 'plans' }
        ]
      });

      if (!pkg) {
        return res.status(404).json({ error: 'Benefit package not found' });
      }

      // Check if any plans are using this package
      const plansUsingPackage = await Plan.findAll({
        where: { benefitPackageId: id }
      });

      if (plansUsingPackage.length > 0) {
        const publishedPlans = plansUsingPackage.filter(p => p.status === 'Published');

        if (publishedPlans.length > 0) {
          return res.status(400).json({
            error: 'Cannot delete benefit package in use',
            details: {
              totalPlans: plansUsingPackage.length,
              publishedPlans: publishedPlans.length,
              planNames: publishedPlans.map(p => p.name),
              message: `This benefit package is used by ${publishedPlans.length} published plan(s).`,
              suggestion: 'Remove this package from all published plans before deleting.'
            }
          });
        }

        // Has draft plans - we'll set their benefitPackageId to null
        await sequelize.transaction(async (t) => {
          // Unlink from draft plans
          await Plan.update(
            { benefitPackageId: null },
            { where: { benefitPackageId: id, status: 'Draft' }, transaction: t }
          );

          // Delete package benefits (cascade)
          await PackageBenefit.destroy({ where: { packageId: id }, transaction: t });

          // Delete the package
          await pkg.destroy({ transaction: t });
        });

        return res.status(200).json({
          message: 'Benefit package deleted successfully',
          packageId: id,
          packageName: pkg.name,
          warning: `Unlinked from ${plansUsingPackage.length} draft plan(s)`
        });
      }

      // No plans using it - safe to delete
      await sequelize.transaction(async (t) => {
        // Delete package benefits (cascade)
        await PackageBenefit.destroy({ where: { packageId: id }, transaction: t });

        // Delete the package
        await pkg.destroy({ transaction: t });
      });

      return res.status(200).json({
        message: 'Benefit package deleted successfully',
        packageId: id,
        packageName: pkg.name
      });

    } catch (error) {
      console.error('Error deleting benefit package:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete benefit package' });
    }
  }

  /**
   * Check if a plan can be deleted (preview)
   * Returns information about what would prevent deletion
   */
  async checkPlanDeletion(req, res) {
    const { id } = req.params;

    try {
      const plan = await Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const subscriptionCount = await Subscription.count({ where: { planId: id } });
      const activeCount = await Subscription.count({
        where: {
          planId: id,
          status: ['Trial', 'Active', 'Grace', 'Past Due']
        }
      });

      const canDelete = subscriptionCount === 0;

      return res.status(200).json({
        canDelete,
        planId: id,
        planName: plan.name,
        status: plan.status,
        subscriptionCount,
        activeSubscriptionCount: activeCount,
        reason: !canDelete
          ? activeCount > 0
            ? `Plan has ${activeCount} active subscription(s)`
            : `Plan has ${subscriptionCount} historical subscription(s)`
          : 'No subscriptions found - safe to delete',
        suggestion: !canDelete ? 'Archive this plan instead of deleting it' : null
      });

    } catch (error) {
      console.error('Error checking plan deletion:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Check if a benefit package can be deleted (preview)
   */
  async checkPackageDeletion(req, res) {
    const { id } = req.params;

    try {
      const pkg = await BenefitPackage.findByPk(id);
      if (!pkg) {
        return res.status(404).json({ error: 'Benefit package not found' });
      }

      const plansUsingPackage = await Plan.findAll({
        where: { benefitPackageId: id }
      });

      const publishedPlans = plansUsingPackage.filter(p => p.status === 'Published');
      const canDelete = publishedPlans.length === 0;

      return res.status(200).json({
        canDelete,
        packageId: id,
        packageName: pkg.name,
        plansUsing: plansUsingPackage.length,
        publishedPlansUsing: publishedPlans.length,
        publishedPlanNames: publishedPlans.map(p => p.name),
        reason: !canDelete
          ? `Package is used by ${publishedPlans.length} published plan(s)`
          : plansUsingPackage.length > 0
            ? `Package is only used by ${plansUsingPackage.length} draft plan(s) - will be unlinked`
            : 'No plans using this package - safe to delete',
        suggestion: !canDelete ? 'Remove this package from all published plans first' : null
      });

    } catch (error) {
      console.error('Error checking package deletion:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new DeletionController();
