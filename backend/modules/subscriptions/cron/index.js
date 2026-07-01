const cron = require('node-cron');
const RenewalService = require('../services/RenewalService');
const MealSubscriptionService = require('../services/MealSubscriptionService');
const { Subscription, Plan, sequelize, Op } = require('../../../database/models.registry');

const initSubscriptionCrons = () => {
  console.log('⏰ Initializing Subscription module background workers...');

  // 1. Process Subscription Renewals & Dunning (Daily at 12:05 AM)
  cron.schedule('5 0 * * *', async () => {
    console.log('[Subscription Cron] Running daily renewal & dunning process...');
    try {
      // Advisory lock / flag checks can be added here if multi-instance is enabled
      const results = await RenewalService.processDunningCycle();
      console.log(`[Subscription Cron] Renewal cycle completed:`, results);
    } catch (error) {
      console.error('❌ [Subscription Cron] Error in renewal cycle:', error);
    }
  });

  // 2. Generate Next Day's Meal Occurrences & Placed Orders (Daily at 11:30 PM)
  // This runs at 11:30 PM to prepare orders for the following day (tomorrow)
  cron.schedule('30 23 * * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    console.log(`[Subscription Cron] Running meal occurrence generation for tomorrow: ${dateStr}...`);
    try {
      const results = await MealSubscriptionService.generateDailyOccurrences(dateStr);
      console.log(`[Subscription Cron] Meal occurrence generation completed:`, results);
    } catch (error) {
      console.error('❌ [Subscription Cron] Error generating meal occurrences:', error);
    }
  });

  // 3. Clean up and Expire past due subscriptions (Every hour)
  cron.schedule('0 * * * *', async () => {
    console.log('[Subscription Cron] Checking for expired grace subscriptions...');
    try {
      const now = new Date();
      // Find all subscriptions in 'Grace' that are past their grace expiry
      const expiredGraceSubs = await Subscription.findAll({
        where: {
          status: 'Grace',
          expiryDate: { [Op.lt]: now } // Expiry date has passed
        },
        include: [{ model: Plan, as: 'plan' }]
      });

      for (const sub of expiredGraceSubs) {
        const graceLimit = new Date(sub.expiryDate);
        graceLimit.setDate(graceLimit.getDate() + (sub.plan.gracePeriodDays || 3));

        if (now >= graceLimit) {
          console.log(`[Subscription Cron] Expiry date + grace period passed for Sub #${sub.id}. Suspending benefits.`);
          await sequelize.transaction(async (t) => {
            sub.status = 'Past Due';
            await sub.save({ transaction: t });

            if (sub.plan.type === 'seller') {
              const SellerSubscriptionService = require('../services/SellerSubscriptionService');
              await SellerSubscriptionService.suspendSellerBenefits(sub.userId);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ [Subscription Cron] Error checking grace expirations:', error);
    }
  });
};

module.exports = { initSubscriptionCrons };
