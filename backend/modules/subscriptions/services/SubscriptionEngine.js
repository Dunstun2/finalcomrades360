const { Subscription, Plan, SubscriptionInvoice, SubscriptionEvent, MealSchedule, sequelize } = require('../../../database/models.registry');
const BillingService = require('./BillingService');
const SellerSubscriptionService = require('./SellerSubscriptionService');
const subscriptionEventBus = require('../events/subscriptionEvents');
const crypto = require('crypto');

class SubscriptionEngine {
  /**
   * Calculate the total weekly price for a custom meal schedule.
   * Looks up the actual FastFood item price for each scheduled meal.
   * @param {Array} customSchedule - Array of schedule entries with fastFoodItemId
   * @returns {number} total weekly price
   */
  async calculateCustomPrice(customSchedule) {
    if (!customSchedule || customSchedule.length === 0) return 0;

    // Dynamically require FastFood model
    const { FastFood } = require('../../../database/models.registry');

    let total = 0;
    for (const entry of customSchedule) {
      const item = await FastFood.findByPk(entry.fastFoodItemId, {
        attributes: ['id', 'basePrice', 'name']
      });
      if (!item) throw new Error(`Fast food item #${entry.fastFoodItemId} not found`);
      total += parseFloat(item.basePrice) || 0;
    }
    return parseFloat(total.toFixed(2));
  }

  /**
   * Main subscribe handler. Supports:
   * 1. Registered users with predefined plans (seller, service plans)
   * 2. Registered users building a custom meal plan
   * 3. Stateless guest checkout for custom meal plans (no account created)
   */
  async subscribe(userId, payload = {}) {
    const { planId, customSchedule, billingCycle = 'weekly', guestName, guestEmail, guestPhone, guestDeliveryAddress } = payload;

    const isGuest = !userId;
    const isCustomMeal = !planId && customSchedule && customSchedule.length > 0;

    if (!planId && !isCustomMeal) {
      throw new Error('Either planId or a customSchedule with food items is required');
    }

    // Guests can ONLY create custom meal plans (no account, no seller plans)
    if (isGuest && planId) {
      throw new Error('Guest users can only subscribe to custom meal plans. Please log in for seller or service plans.');
    }
    if (isGuest && (!guestName || !guestPhone)) {
      throw new Error('Guest name and phone number are required for guest checkout');
    }

    let plan = null;
    let price = 0;
    let cycleDays = 7;
    let scheduleToCreate = null; // Will hold the final schedule entries

    if (planId) {
      // Standard plan subscription
      plan = await Plan.findByPk(planId);
      if (!plan) throw new Error('Subscription plan not found');
      if (plan.status !== 'Published') throw new Error('This plan is not available for purchase');
      price = parseFloat(plan.price) || 0;
      cycleDays = plan.billingCycle === 'monthly' ? 30 : (plan.billingCycle === 'daily' ? 1 : 7);

      // If this plan has a pre-configured template schedule, use it automatically
      if (plan.templateSchedule && plan.templateSchedule.length > 0) {
        scheduleToCreate = plan.templateSchedule.map(entry => ({
          dayOfWeek: entry.dayOfWeek,
          mealTimeType: entry.mealTimeType,
          preferredTime: entry.preferredTime,
          fastFoodItemId: entry.fastFoodItemId,
          pickupStationId: null,
          deliveryAddress: guestDeliveryAddress || null
        }));
      }
    } else {
      // Custom meal plan — price dynamically computed from food items
      price = await this.calculateCustomPrice(customSchedule);
      cycleDays = billingCycle === 'monthly' ? 30 : (billingCycle === 'daily' ? 1 : 7);
      scheduleToCreate = customSchedule;
    }

    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + cycleDays);

    return await sequelize.transaction(async (t) => {
      // Create the Subscription record
      const subData = {
        status: 'Pending',
        startDate: now,
        expiryDate,
        renewalDate: expiryDate,
        autoRenew: isGuest ? false : true, // Guests get upfront payment only, no auto-renew
        customPrice: isCustomMeal ? price : null,
        planId: planId || null
      };

      if (isGuest) {
        // Stateless guest — store contact details on the subscription itself
        subData.guestName = guestName;
        subData.guestEmail = guestEmail || null;
        subData.guestPhone = guestPhone;
        subData.guestDeliveryAddress = guestDeliveryAddress || null;
        subData.guestManageToken = crypto.randomBytes(32).toString('hex');
        subData.userId = null;
      } else {
        subData.userId = userId;
      }

      const sub = await Subscription.create(subData, { transaction: t });

      // Create pending invoice
      const invoice = await SubscriptionInvoice.create({
        subscriptionId: sub.id,
        amount: price,
        status: 'pending',
        paymentMethod: isGuest ? 'mpesa' : 'wallet',
        dueDate: now
      }, { transaction: t });

      if (isGuest) {
        // For guests: M-Pesa STK push would be triggered here in production
        // For now, mark subscription as Pending and return manage token
        // The guest needs to pay before meals are generated
        console.log(`[Guest Subscription] Created for ${guestName} (${guestPhone}). Token: ${sub.guestManageToken}`);
        // TODO: trigger M-Pesa STK push to guestPhone for ${price}

      } else {
        // Registered user: charge wallet immediately
        if (price > 0) {
          await BillingService.chargeWallet(
            userId,
            price,
            planId
              ? `Subscription purchase: ${plan.name}`
              : `Custom meal plan subscription (${customSchedule.length} meals/cycle)`,
            { transaction: t }
          );

          invoice.status = 'paid';
          invoice.paidAt = now;
          invoice.paymentReference = `SUB-${Date.now()}`;
          await invoice.save({ transaction: t });
        } else {
          invoice.status = 'paid';
          invoice.paidAt = now;
          invoice.paymentReference = `FREE-${Date.now()}`;
          await invoice.save({ transaction: t });
        }

        // Set Active status
        const trialDays = plan?.trialPeriodDays || 0;
        sub.status = trialDays > 0 ? 'Trial' : 'Active';
        if (trialDays > 0) {
          const trialExpiry = new Date();
          trialExpiry.setDate(trialExpiry.getDate() + trialDays);
          sub.expiryDate = trialExpiry;
          sub.renewalDate = trialExpiry;
        }
        await sub.save({ transaction: t });

        if (plan?.type === 'seller') {
          await SellerSubscriptionService.reactivateSellerBenefits(userId);
        }
      }

      // Create meal schedule entries if provided
      if (scheduleToCreate && scheduleToCreate.length > 0 && sub.id) {
        for (const entry of scheduleToCreate) {
          await MealSchedule.create({
            subscriptionId: sub.id,
            dayOfWeek: entry.dayOfWeek,
            mealTimeType: entry.mealTimeType,
            preferredTime: entry.preferredTime,
            pickupStationId: entry.pickupStationId || null,
            deliveryAddress: entry.deliveryAddress || guestDeliveryAddress || null,
            preferredFastFoodItemId: entry.fastFoodItemId
          }, { transaction: t });
        }
      }

      subscriptionEventBus.emit('SubscriptionCreated', {
        subscriptionId: sub.id,
        userId: userId || null,
        guestPhone: isGuest ? guestPhone : null,
        planId: planId || null,
        status: sub.status,
        isGuest
      });

      return {
        subscription: sub,
        guestManageToken: isGuest ? sub.guestManageToken : null,
        customPrice: isCustomMeal ? price : null
      };
    });
  }

  /**
   * Upgrades a user from one plan to another with prorated billing.
   * Only for registered users with standard plans.
   */
  async upgrade(userId, newPlanId) {
    const newPlan = await Plan.findByPk(newPlanId);
    if (!newPlan) throw new Error('New plan not found');
    if (newPlan.status !== 'Published') throw new Error('New plan is not available');

    const currentSub = await Subscription.findOne({
      where: {
        userId,
        status: ['Active', 'Trial', 'Grace', 'Past Due']
      },
      include: [{
        model: Plan,
        as: 'plan',
        where: { type: newPlan.type }
      }]
    });

    if (!currentSub) {
      return await this.subscribe(userId, { planId: newPlanId });
    }

    if (currentSub.planId === newPlanId) {
      throw new Error('User is already subscribed to this plan');
    }

    const currentPlan = currentSub.plan;
    const now = new Date();

    return await sequelize.transaction(async (t) => {
      const proratedCredit = BillingService.calculateProratedCredit(currentSub, currentPlan);
      const newPlanPrice = parseFloat(newPlan.price) || 0.00;
      const difference = newPlanPrice - proratedCredit;

      if (difference > 0) {
        await BillingService.chargeWallet(userId, difference, `Upgrade: ${currentPlan.name} -> ${newPlan.name} (Prorated difference)`, { transaction: t });
      } else if (difference < 0) {
        await BillingService.creditWallet(userId, Math.abs(difference), `Downgrade refund: ${currentPlan.name} -> ${newPlan.name}`, { transaction: t });
      }

      await SubscriptionInvoice.create({
        subscriptionId: currentSub.id,
        amount: difference,
        status: 'paid',
        paymentMethod: 'wallet',
        dueDate: now,
        paidAt: now,
        paymentReference: `UPG-${Date.now()}`
      }, { transaction: t });

      await SubscriptionEvent.create({
        subscriptionId: currentSub.id,
        userId,
        eventType: 'SubscriptionUpgraded',
        oldPlanId: currentPlan.id,
        newPlanId: newPlan.id,
        performedBy: userId,
        reason: 'User executed plan upgrade',
        metadata: { proratedCredit, difference }
      }, { transaction: t });

      const cycleDays = newPlan.billingCycle === 'weekly' ? 7 : (newPlan.billingCycle === 'monthly' ? 30 : 1);
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + cycleDays);

      currentSub.planId = newPlan.id;
      currentSub.status = newPlan.trialPeriodDays > 0 ? 'Trial' : 'Active';
      currentSub.startDate = now;
      currentSub.expiryDate = newExpiryDate;
      currentSub.renewalDate = newExpiryDate;
      await currentSub.save({ transaction: t });

      return currentSub;
    });
  }

  /**
   * Cancels a subscription. Supports both user and guest (by token).
   */
  async cancel(subscriptionId, userId = null, guestManageToken = null, reason = 'User requested cancellation') {
    const where = { id: subscriptionId };
    if (userId) where.userId = userId;
    else if (guestManageToken) where.guestManageToken = guestManageToken;
    else throw new Error('Either userId or guestManageToken is required to cancel');

    const sub = await Subscription.findOne({ where });
    if (!sub) throw new Error('Subscription not found');

    sub.autoRenew = false;
    sub.status = 'Cancelled';
    await sub.save();

    if (userId) {
      await SubscriptionEvent.create({
        subscriptionId: sub.id,
        userId,
        eventType: 'SubscriptionCancelled',
        performedBy: userId,
        reason
      });
    }

    const plan = sub.planId ? await Plan.findByPk(sub.planId) : null;
    if (plan && plan.type === 'seller' && userId) {
      await SellerSubscriptionService.suspendSellerBenefits(userId);
    }

    subscriptionEventBus.emit('SubscriptionCancelled', {
      subscriptionId: sub.id,
      userId: userId || null
    });

    return sub;
  }

  /**
   * Find a guest's subscription by their manage token (for the guest manager page).
   */
  async getByGuestToken(token) {
    const sub = await Subscription.findOne({
      where: { guestManageToken: token },
      include: [
        { model: MealSchedule, as: 'schedules' }
      ]
    });
    if (!sub) throw new Error('Subscription not found. Invalid or expired token.');
    return sub;
  }
}

module.exports = new SubscriptionEngine();
