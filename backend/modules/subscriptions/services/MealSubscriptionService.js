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
const BenefitService = require('./BenefitService');
const UsageService = require('./UsageService');
const CashbackService = require('./CashbackService');
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

      // Insert new schedule list.
      // Each incoming item may carry preferredFastFoodItemIds (array, new) or
      // preferredFastFoodItemId (single integer, legacy). When multiple dishes
      // are selected we expand them into one MealSchedule row each so the
      // existing daily-occurrence generator can process them unchanged.
      const created = [];
      for (const item of scheduleList) {
        // Normalise: collect all item IDs from either field
        const foodIds = item.preferredFastFoodItemIds?.length
          ? item.preferredFastFoodItemIds
          : item.preferredFastFoodItemId
            ? [item.preferredFastFoodItemId]
            : [null]; // slot with no dish yet — store one row with null

        for (const foodId of foodIds) {
          const sched = await MealSchedule.create({
            subscriptionId,
            dayOfWeek: item.dayOfWeek.toLowerCase(),
            mealTimeType: item.mealTimeType.toLowerCase(),
            preferredTime: item.preferredTime,
            pickupStationId: item.pickupStationId || null,
            deliveryAddress: item.deliveryAddress || null,
            preferredFastFoodItemId: foodId || null
          }, { transaction: t });
          created.push(sched);
        }
      }

      return created;
    });
  }

  /**
   * Generates Meal Occurrence records and placing orders for a specific date (e.g., tomorrow)
   */
  async generateDailyOccurrences(dateString, options = {}) {
    const targetDate = new Date(dateString);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // 'monday', etc.

    console.log(`[MealGen] Generating occurrences for date: ${dateString} (${dayOfWeek}), options:`, options);

    // Build query for active subscriptions
    const subWhere = {
      status: ['Active', 'Trial', 'Grace']
    };
    if (options.subscriptionId) {
      subWhere.id = options.subscriptionId;
    }

    // Find all active subscriptions (either meal templates or custom meal subscriptions)
    const activeSubs = await Subscription.findAll({
      where: subWhere,
      include: [{
        model: Plan,
        as: 'plan',
        required: false // Left join: custom plans don't have planId
      }]
    });

    // Filter only those that are meal subscriptions (either custom or explicit meal templates)
    const mealSubs = activeSubs.filter(sub => !sub.planId || sub.plan?.type === 'meal');

    const results = [];

    // Grab config for standard base delivery fee
    const deliveryFeeConfig = await PlatformConfig.findOne({ where: { key: 'standard_fastfood_delivery_fee' } });
    const fallbackDeliveryFee = deliveryFeeConfig ? parseFloat(deliveryFeeConfig.value) : 50.00;

    // Grab config for same-day cutoff
    const cutoffConfig = await PlatformConfig.findOne({ where: { key: 'meal_subscription_skip_cutoff_minutes' } });
    const cutoffMinutes = cutoffConfig ? parseInt(cutoffConfig.value) : 40;

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

      if (schedules.length === 0) continue;

      // Group schedules by delivery time & location to merge into single trips
      const groupedSchedules = {};
      
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

        const key = `${sched.preferredTime}_${sched.pickupStationId || 'del'}_${sched.deliveryAddress || 'noaddr'}`;
        if (!groupedSchedules[key]) groupedSchedules[key] = [];
        groupedSchedules[key].push(sched);
      }

      // Process each grouped slot (e.g., Friday 19:00 Delivery to Hostel A)
      for (const key in groupedSchedules) {
        const group = groupedSchedules[key];
        
        await sequelize.transaction(async (t) => {
          // Pre-load benefits
          const freeMealsBenefit = await BenefitService.getActiveBenefit(sub, 'free_meals');
          const freeDeliveryBenefit = await BenefitService.getActiveBenefit(sub, 'free_delivery') || await BenefitService.getActiveBenefit(sub, 'reduced_delivery_fee');
          // Check for both 'meal_discount' and 'disc' feature codes
          const mealDiscountBenefit = await BenefitService.getActiveBenefit(sub, 'meal_discount') || await BenefitService.getActiveBenefit(sub, 'disc');

          // Debug logging
          console.log(`[MealGen] Subscription ${sub.id} benefits check:`);
          console.log(`  - Free Meals: ${!!freeMealsBenefit}`);
          console.log(`  - Free Delivery: ${!!freeDeliveryBenefit}`);
          console.log(`  - Meal Discount: ${!!mealDiscountBenefit}`);
          if (mealDiscountBenefit) {
            console.log(`  - Meal Discount Details:`, JSON.stringify(mealDiscountBenefit.value));
          }

          const hasFreeDelivery = !!freeDeliveryBenefit;
          const isFreeDeliveryUnlimited = !freeDeliveryBenefit?.value?.limit && !freeDeliveryBenefit?.value?.maxFreeDeliveries;
          const freeDeliveryCode = freeDeliveryBenefit?.featureCode || freeDeliveryBenefit?.feature?.code || 'free_delivery';
          const mealDiscountPct = mealDiscountBenefit?.value?.discountPercent || mealDiscountBenefit?.value?.amount || 0;

          // Resolve items and base prices
          let totalBaseFoodPrice = 0;
          let finalFoodPrice = 0;
          let calculatedDeliveryFee = 0;

          const itemsData = [];
          const vendorQuantities = {};
          const vendorBaseFees = {};

          for (const sched of group) {
            let fastFoodItem = null;
            if (sched.preferredFastFoodItemId) {
              fastFoodItem = await FastFood.findByPk(sched.preferredFastFoodItemId, { transaction: t });
            }

            if (!fastFoodItem) {
               console.warn(`[MealGen] No fast food item matched for Schedule #${sched.id}. Order creation deferred.`);
               continue; // Defer if item missing
            }

            const basePrice = parseFloat(fastFoodItem.basePrice) || 0;
            totalBaseFoodPrice += basePrice;
            
            itemsData.push({ sched, fastFoodItem, basePrice });

            // Fast Food Delivery Fee Calculation prep
            const vendorKey = fastFoodItem.sellerId || 'unknown';
            vendorQuantities[vendorKey] = (vendorQuantities[vendorKey] || 0) + 1; // 1 qty per scheduled meal
            if (vendorBaseFees[vendorKey] === undefined) {
               vendorBaseFees[vendorKey] = parseFloat(fastFoodItem.deliveryFee || fallbackDeliveryFee);
            }
          }

          if (itemsData.length === 0) {
            return; // Nothing valid to order in this group
          }

          // Apply fast food incremental fees
          for (const vendorKey in vendorQuantities) {
             const qty = vendorQuantities[vendorKey];
             const baseFee = vendorBaseFees[vendorKey] || 0;
             const incrementalFee = baseFee + (baseFee * 0.55 * Math.max(0, qty - 1));
             calculatedDeliveryFee += incrementalFee;
          }

          let deliveryFee = calculatedDeliveryFee;

          // 1. Calculate Food Price and Deduct Free Meals Usage
          for (const item of itemsData) {
            let itemPrice = item.basePrice;
            let usedFreeMeal = false;
            
            // Try Free Meal
            if (freeMealsBenefit) {
               const remainingFreeMeals = await UsageService.getRemaining(sub.id, 'free_meals', { transaction: t });
               if (remainingFreeMeals > 0) {
                  const maxMealValue = parseFloat(freeMealsBenefit.value?.maxMealValue) || 0;
                  let itemDiscount = 0;
                  let mealsConsumed = 0;
                  let tempRemaining = remainingFreeMeals;
                  
                  while (itemPrice > 0 && tempRemaining > 0) {
                     const stepDiscount = maxMealValue > 0 ? Math.min(itemPrice, maxMealValue) : itemPrice;
                     itemDiscount += stepDiscount;
                     itemPrice -= stepDiscount;
                     tempRemaining--;
                     mealsConsumed++;
                  }
                  
                  if (mealsConsumed > 0) {
                     try {
                       await UsageService.trackUsage(sub.id, 'free_meals', mealsConsumed, { transaction: t });
                     } catch (err) {
                       console.log(`[MealGen] Warning: Could not track free_meals usage: ${err.message}`);
                     }
                  }
                  usedFreeMeal = true;
               }
            }
            
            // If didn't use free meal, try meal discount (with min order check)
            if (!usedFreeMeal && mealDiscountPct > 0) {
               const minOrderForDiscount = mealDiscountBenefit.value?.conditions?.minOrderValue || mealDiscountBenefit.value?.minOrderValue || 0;
               console.log(`[MealGen] Discount check: totalBaseFoodPrice=${totalBaseFoodPrice}, minOrder=${minOrderForDiscount}, discountPct=${mealDiscountPct}`);
               if (totalBaseFoodPrice >= minOrderForDiscount) {
                  const discountAmount = (item.basePrice * mealDiscountPct) / 100;
                  itemPrice = Math.max(0, item.basePrice - discountAmount);
                  console.log(`[MealGen] Discount applied: ${item.basePrice} -> ${itemPrice} (saved ${discountAmount})`);
               } else {
                  console.log(`[MealGen] Discount NOT applied: order total below minimum`);
               }
            }

            item.finalPrice = itemPrice;
            finalFoodPrice += itemPrice;
          }

          // 2. Calculate Delivery Fee and Deduct Free Delivery Usage
          if (hasFreeDelivery) {
             const remainingFreeDeliveries = isFreeDeliveryUnlimited ? Infinity : await UsageService.getRemaining(sub.id, freeDeliveryCode, { transaction: t });
             if (remainingFreeDeliveries > 0) {
                 const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue || freeDeliveryBenefit.value?.minOrderValue || 0;
                 if (totalBaseFoodPrice >= minOrder) {
                    // Support both 'discountPercent' and 'amount' field names for compatibility
                    const discountPct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
                    if (discountPct !== undefined && discountPct > 0 && discountPct < 100) {
                        const discountAmount = (deliveryFee * discountPct) / 100;
                        deliveryFee = Math.max(0, deliveryFee - discountAmount);
                        if (!isFreeDeliveryUnlimited) {
                           try {
                             await UsageService.trackUsage(sub.id, freeDeliveryCode, 1, { transaction: t });
                           } catch (err) {
                             console.log(`[MealGen] Warning: Could not track usage for ${freeDeliveryCode}: ${err.message}`);
                           }
                        }
                    } else {
                        deliveryFee = 0;
                        if (!isFreeDeliveryUnlimited) {
                           try {
                             await UsageService.trackUsage(sub.id, freeDeliveryCode, 1, { transaction: t });
                           } catch (err) {
                             console.log(`[MealGen] Warning: Could not track usage for ${freeDeliveryCode}: ${err.message}`);
                           }
                        }
                    }
                 }
             }
          }

          // 3. Create Grouped Order
          const orderNumber = `MEAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const firstSched = itemsData[0].sched; // Shared routing config

          // Evaluate same-day delay
          let trackingMessage = 'Subscription meal order generated';
          if (options.isSameDay) {
            const [hours, minutes] = firstSched.preferredTime.split(':').map(Number);
            const deliveryTime = new Date();
            deliveryTime.setHours(hours, minutes, 0, 0);
            
            const now = new Date();
            const differenceMinutes = (deliveryTime.getTime() - now.getTime()) / (1000 * 60);
            
            if (differenceMinutes < cutoffMinutes) {
               trackingMessage = 'Subscription activated near meal time. Delivery schedule adjusted by +1 hour to allow for preparation.';
               console.log(`[MealGen] Same-day order delayed by 1 hour for Sub #${sub.id}`);
            }
          }

          const order = await Order.create({
            userId: sub.userId,
            orderNumber,
            checkoutGroupId: orderNumber,
            checkoutOrderNumber: orderNumber,
            status: 'order_placed',
            paymentMethod: 'wallet',
            paymentType: 'subscription',
            paymentConfirmed: true,
            deliveryMethod: firstSched.pickupStationId ? 'pick_station' : 'direct_delivery',
            pickStation: firstSched.pickupStationId || null,
            total: finalFoodPrice + deliveryFee,
            deliveryFee: deliveryFee,
            deliveryAddress: firstSched.deliveryAddress || 'Hostel Delivery',
            trackingUpdates: JSON.stringify([{
              status: 'order_placed',
              message: trackingMessage,
              timestamp: new Date().toISOString()
            }])
            // Note: Cashback will be automatically processed when order status changes to 'delivered' or 'completed'
          }, { transaction: t });

          // 4. Create OrderItems & Occurrences
          for (const item of itemsData) {
            const { sched, fastFoodItem, basePrice, finalPrice } = item;

            await OrderItem.create({
              orderId: order.id,
              fastFoodId: fastFoodItem.id,
              name: fastFoodItem.name,
              quantity: 1,
              price: finalPrice,
              basePrice: basePrice,
              deliveryFee: 0.00 // Represented at order level
            }, { transaction: t });

            const occurrence = await MealOccurrence.create({
              subscriptionId: sub.id,
              mealScheduleId: sched.id,
              date: dateString,
              status: 'scheduled',
              deliveryAddress: sched.deliveryAddress,
              pickupStationId: sched.pickupStationId,
              orderId: order.id // Linked to grouped order!
            }, { transaction: t });

            subscriptionEventBus.emit('MealRedeemed', {
              subscriptionId: sub.id,
              userId: sub.userId,
              occurrenceId: occurrence.id,
              orderId: order.id,
              date: dateString
            });

            results.push({ occurrenceId: occurrence.id, orderCreated: true, orderId: order.id });
          }
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
