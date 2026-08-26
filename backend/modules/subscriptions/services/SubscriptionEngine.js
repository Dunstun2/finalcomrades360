const { Subscription, Plan, SubscriptionInvoice, SubscriptionEvent, MealSchedule, sequelize } = require('../../../database/models.registry');
const BillingService = require('./BillingService');
const SellerSubscriptionService = require('./SellerSubscriptionService');
const subscriptionEventBus = require('../events/subscriptionEvents');
const crypto = require('crypto');
const { generateCostProjection } = require('../utils/costProjectionCalculator');

class SubscriptionEngine {
  /**
   * Calculate the total weekly price for a custom meal schedule.
   * Looks up the actual FastFood item price for each scheduled meal.
   * @param {Array} customSchedule - Array of schedule entries with fastFoodItemIds[] or fastFoodItemId
   * @returns {number} total weekly price
   */
  async calculateCustomPrice(customSchedule) {
    if (!customSchedule || customSchedule.length === 0) return 0;

    // Dynamically require FastFood model
    const { FastFood } = require('../../../database/models.registry');

    let total = 0;
    for (const entry of customSchedule) {
      // Support both new multi-select array and legacy single id
      const ids = entry.fastFoodItemIds?.length
        ? entry.fastFoodItemIds
        : entry.fastFoodItemId ? [entry.fastFoodItemId] : [];

      for (const id of ids) {
        const item = await FastFood.findByPk(id, {
          attributes: ['id', 'basePrice', 'name']
        });
        if (!item) throw new Error(`Fast food item #${id} not found`);
        total += parseFloat(item.basePrice) || 0;
      }
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
    const { 
      planId, customSchedule, billingCycle = 'weekly', 
      guestName, guestEmail, guestPhone, guestDeliveryAddress,
      paymentProofUrl, paymentMethod, paymentSubType
    } = payload;

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

      // If this plan has a pre-configured template schedule, use it automatically.
      // Each slot may carry fastFoodItemIds[] (multi) or legacy fastFoodItemId — expand
      // to one entry per dish so MealSchedule rows stay one-item-per-row.
      if (plan.templateSchedule && plan.templateSchedule.length > 0) {
        scheduleToCreate = plan.templateSchedule.flatMap(entry => {
          const ids = entry.fastFoodItemIds?.length
            ? entry.fastFoodItemIds
            : entry.fastFoodItemId ? [entry.fastFoodItemId] : [null];
          return ids.map(id => ({
            dayOfWeek: entry.dayOfWeek,
            mealTimeType: entry.mealTimeType,
            preferredTime: entry.preferredTime,
            fastFoodItemId: id,
            pickupStationId: null,
            deliveryAddress: guestDeliveryAddress || null
          }));
        });
      }
    } else {
      // Custom meal plan — price dynamically computed from food items
      price = await this.calculateCustomPrice(customSchedule);
      cycleDays = billingCycle === 'monthly' ? 30 : (billingCycle === 'daily' ? 1 : 7);
      scheduleToCreate = customSchedule;
    }

    const now = new Date();
    let expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + cycleDays);

    // For meal plans with date-based schedules, derive expiry from the latest
    // scheduled date so the subscription covers the entire meal plan window.
    const rawSchedule = scheduleToCreate || (plan?.templateSchedule) || [];
    if (rawSchedule.length > 0) {
      let latestDate = null;
      for (const entry of rawSchedule) {
        const dVal = entry.dayOfWeek || entry.scheduledDate;
        if (dVal && /^\d{4}-\d{2}-\d{2}/.test(dVal)) {
          const d = new Date(dVal);
          if (!isNaN(d) && (!latestDate || d > latestDate)) {
            latestDate = d;
          }
        }
      }
      if (latestDate) {
        // Set expiry to the end of the latest scheduled day (+ 1 day buffer)
        const scheduleExpiry = new Date(latestDate);
        scheduleExpiry.setDate(scheduleExpiry.getDate() + 1);
        if (scheduleExpiry > expiryDate) {
          expiryDate = scheduleExpiry;
        }
      }
    }

    const result = await sequelize.transaction(async (t) => {
      // Create the Subscription record
      const subData = {
        status: 'Pending',
        startDate: now,
        expiryDate,
        renewalDate: expiryDate,
        autoRenew: (isGuest || plan?.type === 'meal' || isCustomMeal) ? false : true, // Guests and meal plans get upfront payment only, no auto-renew
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

      // Generate cost projection snapshot for meal subscriptions
      if (scheduleToCreate && scheduleToCreate.length > 0 && (plan?.type === 'meal' || isCustomMeal)) {
        try {
          // Fetch food items referenced in the schedule
          const foodIds = new Set();
          scheduleToCreate.forEach(entry => {
            if (entry.fastFoodItemIds?.length) {
              entry.fastFoodItemIds.forEach(id => foodIds.add(id));
            } else if (entry.fastFoodItemId) {
              foodIds.add(entry.fastFoodItemId);
            }
          });

          const { FastFood, PackageBenefit, Feature } = require('../../../database/models.registry');
          const foodItems = await FastFood.findAll({
            where: { id: Array.from(foodIds) },
            transaction: t
          });

          // Get active benefits for this subscription
          let benefits = [];
          if (plan?.benefitPackageId) {
            const packageBenefits = await PackageBenefit.findAll({
              where: { packageId: plan.benefitPackageId },
              include: [{ model: Feature, as: 'feature' }],
              transaction: t
            });
            benefits = packageBenefits;
          }
          if (plan?.benefits?.length) {
            benefits = [...benefits, ...plan.benefits];
          }

          // Generate the cost projection snapshot
          const costProjection = await generateCostProjection(
            scheduleToCreate,
            foodItems,
            benefits,
            plan?.billingCycle || billingCycle || 'weekly'
          );

          if (costProjection) {
            sub.costProjectionSnapshot = costProjection;
            await sub.save({ transaction: t });
            console.log(`✅ Cost projection snapshot saved for subscription #${sub.id}`);
          }
        } catch (err) {
          console.error(`⚠️ Failed to generate cost projection snapshot for subscription #${sub.id}:`, err.message);
          // Don't fail the subscription creation if snapshot generation fails
        }
      }

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
        // Registered user: for prepay subscriptions with payment verification
        // Check if this is a prepay with payment proof (manual verification)
        
        if (paymentProofUrl && price > 0) {
          // Create an order for payment verification instead of charging wallet immediately
          const { Order, User } = require('../../../database/models.registry');
          
          // Get user information for registered users
          let customerData = null;
          if (userId) {
            const user = await User.findByPk(userId, {
              attributes: ['id', 'name', 'email', 'phone'],
              transaction: t
            });
            
            if (user) {
              customerData = {
                name: user.name,
                email: user.email,
                phone: user.phone,
                userId: user.id
              };
            }
          }
          
          const orderData = {
            userId: userId,
            orderNumber: `SUB-${Date.now()}`,
            subscriptionId: sub.id,
            total: price,
            status: 'order_placed',
            paymentMethod: paymentMethod || 'Mobile Money',
            paymentType: 'prepay',
            paymentSubType: paymentSubType || 'mpesa_prepay',
            paymentConfirmed: false,
            items: 1,
            paymentProofUrl: paymentProofUrl,
            needsPaymentVerification: true,
            paymentVerificationStatus: 'pending',
            guestData: customerData // Store user info for admin visibility
          };

          await Order.create(orderData, { transaction: t });

          // Keep subscription as Pending until payment is verified
          sub.status = 'Pending';
          await sub.save({ transaction: t });

          // Mark invoice as pending payment verification
          invoice.status = 'pending_verification';
          await invoice.save({ transaction: t });

        } else {
          // Free plan, no payment proof, or use existing wallet logic
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
      }

      // Create meal schedule entries if provided.
      // For the custom-schedule path entries may still carry fastFoodItemIds[],
      // so we expand them to one MealSchedule row per dish here too.
      if (scheduleToCreate && scheduleToCreate.length > 0 && sub.id) {
        for (const entry of scheduleToCreate) {
          const ids = entry.fastFoodItemIds?.length
            ? entry.fastFoodItemIds
            : entry.fastFoodItemId ? [entry.fastFoodItemId] : [null];

          for (const foodId of ids) {
            await MealSchedule.create({
              subscriptionId: sub.id,
              dayOfWeek: entry.dayOfWeek,
              mealTimeType: entry.mealTimeType,
              preferredTime: entry.preferredTime,
              pickupStationId: entry.pickupStationId || null,
              deliveryAddress: entry.deliveryAddress || guestDeliveryAddress || null,
              preferredFastFoodItemId: foodId || null
            }, { transaction: t });
          }
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
        customPrice: isCustomMeal ? price : null,
        needsPaymentVerification: paymentProofUrl && price > 0 && !isGuest
      };
    });

    // Check for same-day delivery if the subscription was activated immediately
    if (result.subscription && (result.subscription.status === 'Active' || result.subscription.status === 'Trial')) {
      const MealSubscriptionService = require('./MealSubscriptionService');
      const todayDateStr = new Date().toISOString().split('T')[0];
      
      // Attempt to generate same-day occurrence if applicable
      // We do this non-blocking to avoid holding up the response
      MealSubscriptionService.generateDailyOccurrences(todayDateStr, {
        isSameDay: true,
        subscriptionId: result.subscription.id
      }).catch(err => {
        console.error(`[SubscriptionEngine] Failed to generate same-day occurrences for Sub #${result.subscription.id}:`, err);
      });
    }

    return result;
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
   * Now includes an option for automated wallet proration.
   */
  async cancel(subscriptionId, userId = null, guestManageToken = null, reason = 'User requested cancellation', issueRefund = false, isAdmin = false) {
    const where = { id: subscriptionId };
    
    if (!isAdmin) {
      if (userId) where.userId = userId;
      else if (guestManageToken) where.guestManageToken = guestManageToken;
      else throw new Error('Either userId, guestManageToken, or isAdmin is required to cancel');
    }

    return await sequelize.transaction(async (t) => {
      const sub = await Subscription.findOne({ where, transaction: t });
      if (!sub) throw new Error('Subscription not found');

      sub.autoRenew = false;
      sub.status = 'Cancelled';
      await sub.save({ transaction: t });

      if (userId) {
        await SubscriptionEvent.create({
          subscriptionId: sub.id,
          userId: sub.userId || userId,
          eventType: 'SubscriptionCancelled',
          performedBy: userId,
          reason
        }, { transaction: t });
      }

      const plan = sub.planId ? await Plan.findByPk(sub.planId, { transaction: t }) : null;
      if (plan && plan.type === 'seller' && sub.userId) {
        await SellerSubscriptionService.suspendSellerBenefits(sub.userId);
      }

      let processedRefundAmount = 0;

      // Handle Automated Refund
      if (issueRefund && plan && plan.type === 'meal' && sub.costProjectionSnapshot && sub.userId) {
        const { MealOccurrence, Wallet, Transaction } = require('../../../database/models.registry');
        
        // Find unfulfilled occurrences
        const unfulfilled = await MealOccurrence.findAll({
          where: {
            subscriptionId: sub.id,
            status: ['scheduled', 'pending']
          },
          transaction: t
        });

        const totalMeals = sub.costProjectionSnapshot.scheduleBreakdown?.length || 1;
        const finalTotal = sub.costProjectionSnapshot.totals?.finalTotal || 0;
        
        if (unfulfilled.length > 0 && finalTotal > 0) {
          // Cancel the occurrences
          for (const occ of unfulfilled) {
            occ.status = 'cancelled';
            await occ.save({ transaction: t });
          }

          // Calculate prorated refund
          const refundAmount = Math.round((finalTotal / totalMeals) * unfulfilled.length);
          
          if (refundAmount > 0) {
            let wallet = await Wallet.findOne({ where: { userId: sub.userId }, transaction: t });
            if (!wallet) {
              wallet = await Wallet.create({ userId: sub.userId, balance: 0, pendingBalance: 0, successBalance: 0 }, { transaction: t });
            }
            
            wallet.balance = parseFloat(wallet.balance) + refundAmount;
            await wallet.save({ transaction: t });

            await Transaction.create({
              userId: sub.userId,
              walletType: 'customer',
              type: 'credit',
              amount: refundAmount,
              status: 'completed',
              description: `Refund for cancelled subscription #${sub.id} - Reason: ${reason}`
            }, { transaction: t });
            
            processedRefundAmount = refundAmount;
          }
        }
      }

      subscriptionEventBus.emit('SubscriptionCancelled', {
        subscriptionId: sub.id,
        userId: sub.userId || userId || null,
        refundAmount: processedRefundAmount,
        reason
      });

      return sub;
    });
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
