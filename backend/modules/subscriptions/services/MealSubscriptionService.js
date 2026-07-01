const { 
  MealSchedule, 
  MealOccurrence, 
  Subscription, 
  Plan, 
  FastFood, 
  Order, 
  OrderItem, 
  PlatformConfig,
  sequelize 
} = require('../../../database/models.registry');
const BillingService = require('./BillingService');
const subscriptionEventBus = require('../events/subscriptionEvents');
const { Op } = require('sequelize');

class MealSubscriptionService {
  /**
   * Overwrites/Saves the weekly schedule for a subscription.
   */
  async saveSchedule(subscriptionId, userId, scheduleList) {
    const sub = await Subscription.findOne({
      where: { id: subscriptionId, userId }
    });
    if (!sub) throw new Error('Subscription not found');

    return await sequelize.transaction(async (t) => {
      // Clear existing schedule
      await MealSchedule.destroy({
        where: { subscriptionId },
        transaction: t
      });

      // Insert new schedule list
      const created = [];
      for (const item of scheduleList) {
        const sched = await MealSchedule.create({
          subscriptionId,
          dayOfWeek: item.dayOfWeek.toLowerCase(),
          mealTimeType: item.mealTimeType.toLowerCase(),
          preferredTime: item.preferredTime,
          pickupStationId: item.pickupStationId || null,
          deliveryAddress: item.deliveryAddress || null,
          preferredFastFoodItemId: item.preferredFastFoodItemId || null
        }, { transaction: t });
        created.push(sched);
      }

      return created;
    });
  }

  /**
   * Generates Meal Occurrence records and placing orders for a specific date (e.g., tomorrow)
   */
  async generateDailyOccurrences(dateString) {
    const targetDate = new Date(dateString);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // 'monday', etc.

    console.log(`[MealGen] Generating occurrences for date: ${dateString} (${dayOfWeek})`);

    // Find all active subscriptions (either meal templates or custom meal subscriptions)
    const activeSubs = await Subscription.findAll({
      where: {
        status: ['Active', 'Trial', 'Grace']
      },
      include: [{
        model: Plan,
        as: 'plan',
        required: false // Left join: custom plans don't have planId
      }]
    });

    // Filter only those that are meal subscriptions (either custom or explicit meal templates)
    const mealSubs = activeSubs.filter(sub => !sub.planId || sub.plan?.type === 'meal');

    const results = [];

    for (const sub of mealSubs) {
      // Find matching schedules for this weekday or specific date
      const schedules = await MealSchedule.findAll({
        where: {
          subscriptionId: sub.id,
          dayOfWeek: {
            [Op.in]: [dayOfWeek, dateString]
          }
        }
      });

      for (const sched of schedules) {
        // Prevent duplicate generation
        const existing = await MealOccurrence.findOne({
          where: {
            subscriptionId: sub.id,
            mealScheduleId: sched.id,
            date: dateString
          }
        });

        if (existing) {
          console.log(`[MealGen] Occurrence already exists for Sub #${sub.id}, Sched #${sched.id} on ${dateString}`);
          continue;
        }

        await sequelize.transaction(async (t) => {
          // Create Occurrence
          const occurrence = await MealOccurrence.create({
            subscriptionId: sub.id,
            mealScheduleId: sched.id,
            date: dateString,
            status: 'scheduled',
            deliveryAddress: sched.deliveryAddress,
            pickupStationId: sched.pickupStationId
          }, { transaction: t });

          // Generate zero-cost Order in Comrades360 Order system
          let fastFoodItem = null;
          if (sched.preferredFastFoodItemId) {
            fastFoodItem = await FastFood.findByPk(sched.preferredFastFoodItemId, { transaction: t });
          }

          if (!fastFoodItem) {
            console.warn(`[MealGen] No fast food item matched for Schedule #${sched.id}. Order creation deferred.`);
            results.push({ occurrenceId: occurrence.id, orderCreated: false });
            return;
          }

          const orderNumber = `MEAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

          // Create the main Order
          const order = await Order.create({
            userId: sub.userId,
            orderNumber,
            checkoutGroupId: orderNumber,
            checkoutOrderNumber: orderNumber,
            status: 'order_placed',
            paymentMethod: 'wallet',
            paymentType: 'subscription',
            paymentConfirmed: true,
            deliveryMethod: sched.pickupStationId ? 'pick_station' : 'direct_delivery',
            pickStation: sched.pickupStationId || null,
            total: 0.00,
            deliveryAddress: sched.deliveryAddress || 'Hostel Delivery',
            trackingUpdates: JSON.stringify([{
              status: 'order_placed',
              message: 'Subscription meal order generated',
              timestamp: new Date().toISOString()
            }])
          }, { transaction: t });

          // Create OrderItem (Prepaid subscription meal reference)
          await OrderItem.create({
            orderId: order.id,
            fastFoodId: fastFoodItem.id,
            name: fastFoodItem.name,
            quantity: 1,
            price: 0.00,
            basePrice: fastFoodItem.basePrice || 0.00,
            deliveryFee: 0.00
          }, { transaction: t });

          // Link order back to occurrence
          occurrence.orderId = order.id;
          await occurrence.save({ transaction: t });

          // Emit Event
          subscriptionEventBus.emit('MealRedeemed', {
            subscriptionId: sub.id,
            userId: sub.userId,
            occurrenceId: occurrence.id,
            orderId: order.id,
            date: dateString
          });

          results.push({ occurrenceId: occurrence.id, orderCreated: true, orderId: order.id });
        });
      }
    }

    return results;
  }

  /**
   * Skips a meal occurrence if within cutoff and refunds the meal value to Wallet.
   */
  async skipMeal(occurrenceId, userId) {
    const occurrence = await MealOccurrence.findByPk(occurrenceId, {
      include: [{
        model: Subscription,
        as: 'subscription'
      }]
    });

    if (!occurrence) throw new Error('Meal occurrence not found');
    if (occurrence.subscription.userId !== userId) throw new Error('Unauthorized');
    if (occurrence.status !== 'scheduled') throw new Error(`Cannot skip meal in '${occurrence.status}' status`);

    // Verify cutoff window from Config (e.g. 40 minutes before delivery preferredTime)
    const configRecord = await PlatformConfig.findOne({ where: { key: 'meal_subscription_skip_cutoff_minutes' } });
    const cutoffMinutes = configRecord ? parseInt(configRecord.value) : 40;

    const schedule = await MealSchedule.findByPk(occurrence.mealScheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const [hours, minutes] = schedule.preferredTime.split(':').map(Number);
    const deliveryTime = new Date(occurrence.date);
    deliveryTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const differenceMs = deliveryTime.getTime() - now.getTime();
    const differenceMinutes = differenceMs / (1000 * 60);

    if (differenceMinutes < cutoffMinutes) {
      throw new Error(`Cannot skip meal. Cutoff limit is ${cutoffMinutes} minutes before delivery.`);
    }

    // Load refund value for this specific meal occurrence (schedule already loaded above)
    let refundAmount = 0;

    if (schedule && schedule.preferredFastFoodItemId) {
      // For custom plans: refund the exact food item price
      const foodItem = await FastFood.findByPk(schedule.preferredFastFoodItemId);
      if (foodItem) refundAmount = parseFloat(foodItem.basePrice) || 0;
    } else if (occurrence.subscription.planId) {
      // For template plans: refund prorated plan price
      const plan = await Plan.findByPk(occurrence.subscription.planId);
      if (plan) {
        const divisor = plan.billingCycle === 'weekly' ? 5 : (plan.billingCycle === 'monthly' ? 20 : 1);
        refundAmount = parseFloat((parseFloat(plan.price) / divisor).toFixed(2));
      }
    } else if (occurrence.subscription.customPrice) {
      // Fallback: split total customPrice evenly across the cycle
      const sub = occurrence.subscription;
      const billingCycle = sub.billingCycle || 'weekly';
      const divisor = billingCycle === 'weekly' ? 5 : (billingCycle === 'monthly' ? 20 : 1);
      refundAmount = parseFloat((parseFloat(sub.customPrice) / divisor).toFixed(2));
    }

    await sequelize.transaction(async (t) => {
      occurrence.status = 'skipped';
      await occurrence.save({ transaction: t });

      // Cancel the order if generated
      if (occurrence.orderId) {
        const order = await Order.findByPk(occurrence.orderId, { transaction: t });
        if (order) {
          order.status = 'cancelled';
          await order.save({ transaction: t });
        }
      }

      // Credit wallet (only for registered users; guests get separate handling)
      if (occurrence.subscription.userId && refundAmount > 0) {
        await BillingService.creditWallet(
          occurrence.subscription.userId,
          refundAmount,
          `Refund for skipped meal occurrence on ${occurrence.date}`,
          { transaction: t }
        );
      }

      // Log subscription event
      subscriptionEventBus.emit('MealSkipped', {
        subscriptionId: occurrence.subscriptionId,
        userId,
        occurrenceId: occurrence.id,
        refundAmount
      });
    });

    return { skipped: true, refundAmount };
  }

  /**
   * Updates delivery address for a single occurrence if within cutoff.
   */
  async updateOccurrenceAddress(occurrenceId, userId, deliveryAddress, pickupStationId = null) {
    const occurrence = await MealOccurrence.findByPk(occurrenceId, {
      include: [{
        model: Subscription,
        as: 'subscription'
      }]
    });

    if (!occurrence) throw new Error('Meal occurrence not found');
    if (occurrence.subscription.userId !== userId) throw new Error('Unauthorized');
    if (occurrence.status !== 'scheduled') throw new Error('Cannot redirect a processed meal');

    // Cutoff validation
    const configRecord = await PlatformConfig.findOne({ where: { key: 'meal_subscription_skip_cutoff_minutes' } });
    const cutoffMinutes = configRecord ? parseInt(configRecord.value) : 40;

    const schedule = await MealSchedule.findByPk(occurrence.mealScheduleId);
    const [hours, minutes] = schedule.preferredTime.split(':').map(Number);
    const deliveryTime = new Date(occurrence.date);
    deliveryTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const differenceMinutes = (deliveryTime.getTime() - now.getTime()) / (1000 * 60);

    if (differenceMinutes < cutoffMinutes) {
      throw new Error(`Cannot modify delivery address. Cutoff limit is ${cutoffMinutes} minutes before delivery.`);
    }

    await sequelize.transaction(async (t) => {
      occurrence.deliveryAddress = deliveryAddress;
      occurrence.pickupStationId = pickupStationId || null;
      await occurrence.save({ transaction: t });

      // Update Order record if it exists
      if (occurrence.orderId) {
        const order = await Order.findByPk(occurrence.orderId, { transaction: t });
        if (order) {
          order.deliveryAddress = deliveryAddress;
          order.pickStation = pickupStationId || null;
          order.deliveryMethod = pickupStationId ? 'pick_station' : 'direct_delivery';
          await order.save({ transaction: t });
        }
      }
    });

    return occurrence;
  }
}

module.exports = new MealSubscriptionService();
