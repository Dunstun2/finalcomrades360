const { Subscription, Plan, SubscriptionInvoice, SubscriptionEvent, sequelize, Op } = require('../../../database/models.registry');
const BillingService = require('./BillingService');
const SellerSubscriptionService = require('./SellerSubscriptionService');
const subscriptionEventBus = require('../events/subscriptionEvents');

class RenewalService {
  /**
   * Main auto-renewal logic for a single subscription.
   * Executed by the Renewal Scheduler daily.
   */
  async renewSubscription(subscriptionId) {
    const sub = await Subscription.findByPk(subscriptionId, {
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!sub) throw new Error('Subscription not found');
    
    // Ignore terminal states
    if (['Cancelled', 'Expired'].includes(sub.status)) {
      return { success: false, reason: 'Subscription is cancelled or expired' };
    }

    // Guest subscriptions are upfront-paid only — no auto-renewal
    if (!sub.userId) {
      return { success: false, reason: 'Guest subscriptions are not auto-renewed' };
    }

    // Use customPrice if set (custom meal plan), else fall back to plan price
    const planPrice = parseFloat(sub.customPrice ?? sub.plan?.price ?? 0);
    const now = new Date();

    return await sequelize.transaction(async (t) => {
      // 1. Create Invoice record in Pending state
      const invoice = await SubscriptionInvoice.create({
        subscriptionId: sub.id,
        amount: planPrice,
        status: 'pending',
        paymentMethod: 'wallet',
        dueDate: now
      }, { transaction: t });

      try {
        // 2. Attempt to debit the wallet
        await BillingService.chargeWallet(
          sub.userId,
          planPrice,
          sub.customPrice
            ? `Renewal: Custom meal plan (${planPrice} KES)`
            : `Renewal fee for plan: ${sub.plan?.name}`,
          { transaction: t }
        );

        // 3. Update Invoice to Paid
        invoice.status = 'paid';
        invoice.paidAt = now;
        invoice.paymentReference = `REN-${Date.now()}`;
        await invoice.save({ transaction: t });

        // 4. Update Subscription dates
        // For custom meal plans (no planId), default to weekly renewal
        const billingCycle = sub.plan?.billingCycle || sub.billingCycle || 'weekly';
        const cycleDays = billingCycle === 'weekly' ? 7 : (billingCycle === 'monthly' ? 30 : 1);
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + cycleDays);

        const oldStatus = sub.status;
        sub.status = 'Active';
        sub.startDate = now;
        sub.expiryDate = newExpiryDate;
        sub.renewalDate = newExpiryDate;
        sub.pausedAt = null;
        await sub.save({ transaction: t });

        // If transitioning back from Past Due / Grace, reactivate listings (seller plans only)
        if (['Past Due', 'Grace'].includes(oldStatus) && sub.plan?.type === 'seller') {
          await SellerSubscriptionService.reactivateSellerBenefits(sub.userId);
        }

        // Emit success event
        subscriptionEventBus.emit('SubscriptionRenewed', {
          subscriptionId: sub.id,
          userId: sub.userId,
          planId: sub.planId,
          amount: planPrice
        });

        return { success: true, invoiceId: invoice.id };

      } catch (err) {
        // 4. Handle Insufficient Funds / Payment failure (Dunning flow)
        invoice.status = 'failed';
        await invoice.save({ transaction: t });

        const gracePeriodDays = sub.plan?.gracePeriodDays ?? 3;
        const graceLimit = new Date(sub.expiryDate);
        graceLimit.setDate(graceLimit.getDate() + gracePeriodDays);

        const isGraceExpired = now >= graceLimit;

        const oldStatus = sub.status;

        if (sub.status === 'Active' || sub.status === 'Trial') {
          // Transition to Grace (3 days remaining)
          sub.status = 'Grace';
          await sub.save({ transaction: t });
          
          subscriptionEventBus.emit('SubscriptionPaused', {
            subscriptionId: sub.id,
            userId: sub.userId,
            reason: 'Payment failed, entering grace period.'
          });

        } else if (sub.status === 'Grace' && isGraceExpired) {
          // Transition to Past Due (suspend benefits)
          sub.status = 'Past Due';
          await sub.save({ transaction: t });

          if (sub.plan?.type === 'seller') {
            await SellerSubscriptionService.suspendSellerBenefits(sub.userId);
          }

          subscriptionEventBus.emit('SubscriptionExpired', {
            subscriptionId: sub.id,
            userId: sub.userId,
            reason: 'Grace period expired, benefits suspended.'
          });
        }

        return { 
          success: false, 
          reason: `Payment failed. Transitioned from ${oldStatus} to ${sub.status}`,
          invoiceId: invoice.id 
        };
      }
    });
  }

  /**
   * Run dunning cycle for all active/grace subscriptions.
   * Runs daily in background.
   */
  async processDunningCycle() {
    console.log('[Dunning] Starting daily renewal and dunning cycle...');
    const now = new Date();

    // Find subscriptions that expire today or are in grace
    const subscriptions = await Subscription.findAll({
      where: {
        status: ['Active', 'Grace', 'Past Due'],
        autoRenew: true,
        expiryDate: { [Op.lte]: now }
      }
    });

    const results = [];
    for (const sub of subscriptions) {
      try {
        const res = await this.renewSubscription(sub.id);
        results.push({ subscriptionId: sub.id, ...res });
      } catch (err) {
        console.error(`[Dunning] Failed renewing Subscription #${sub.id}:`, err);
        results.push({ subscriptionId: sub.id, success: false, error: err.message });
      }
    }

    return results;
  }
}

module.exports = new RenewalService();
