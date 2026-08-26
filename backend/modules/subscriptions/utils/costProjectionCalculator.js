/**
 * Cost Projection Calculator
 * 
 * Generates the exact Schedule & Projected Cost table data structure
 * that matches what's displayed on the frontend. This snapshot is saved
 * with the subscription so customers see the same breakdown shown at creation time.
 */

const DAY_ORDER = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2 };
const FALLBACK_DELIVERY_FEE = 50;
const INCREMENT_RATE = 0.55;

/**
 * Get customer-facing price from a FastFood item
 */
function getCustomerPrice(item) {
  if (!item) return 0;
  const discount = item.discountPrice ? Number(item.discountPrice) : 0;
  const display = item.displayPrice ? Number(item.displayPrice) : 0;
  const base = item.basePrice ? Number(item.basePrice) : 0;
  return discount > 0 ? discount : display > 0 ? display : base;
}

/**
 * Sort schedule slots by day and meal time
 */
function sortSlots(slots) {
  return [...slots].sort((a, b) => {
    const da = DAY_ORDER[a.dayOfWeek] ?? 99;
    const db = DAY_ORDER[b.dayOfWeek] ?? 99;
    if (da !== db) return da - db;
    return (MEAL_ORDER[a.mealTimeType] ?? 9) - (MEAL_ORDER[b.mealTimeType] ?? 9);
  });
}

/**
 * Generate cost projection snapshot for a meal subscription
 * 
 * @param {Array} schedule - Meal schedule entries with fastFoodItemIds or fastFoodItemId
 * @param {Array} fastFoodItems - Available food items (with prices frozen at subscription time)
 * @param {Array} activeBenefits - Benefits to apply
 * @param {String} billingCycle - 'weekly', 'monthly', etc.
 * @returns {Object} Cost projection snapshot with detailed breakdown
 */
async function generateCostProjection(schedule, fastFoodItems, activeBenefits = [], billingCycle = 'weekly') {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  // Create a frozen food items map with prices at subscription time
  const frozenFoodMap = {};
  fastFoodItems.forEach(food => {
    frozenFoodMap[food.id] = {
      id: food.id,
      name: food.name,
      basePrice: getCustomerPrice(food),
      deliveryFee: parseFloat(food.deliveryFee || FALLBACK_DELIVERY_FEE),
      sellerId: food.sellerId || 'unknown'
    };
  });

  // Store frozen food items in the snapshot for future reference
  const frozenFoodItems = Object.values(frozenFoodMap);

  // Debug: Log all active benefits
  console.log('[CostProjection] Active benefits received:', activeBenefits.map(b => ({
    featureCode: b.featureCode || b.feature?.code,
    value: b.value
  })));

  // Extract benefit configurations
  const freeMealsBenefit = activeBenefits.find(b => (b.featureCode || b.feature?.code) === 'free_meals');
  const freeDeliveryBenefit = activeBenefits.find(b =>
    ['free_delivery', 'reduced_delivery_fee'].includes(b.featureCode || b.feature?.code));
  // Check for both 'meal_discount' and 'disc' feature codes
  const mealDiscountBenefit = activeBenefits.find(b => 
    ['meal_discount', 'disc'].includes(b.featureCode || b.feature?.code));

  console.log('[CostProjection] Meal discount benefit found:', !!mealDiscountBenefit);
  if (mealDiscountBenefit) {
    console.log('[CostProjection] Meal discount details:', {
      featureCode: mealDiscountBenefit.featureCode || mealDiscountBenefit.feature?.code,
      value: mealDiscountBenefit.value
    });
  }

  const maxFreeMeals = freeMealsBenefit?.value?.limit || 0;
  const maxMealValue = freeMealsBenefit?.value?.maxMealValue || 0;
  const hasFreeDelivery = !!freeDeliveryBenefit;
  const isFDUnlimited = !freeDeliveryBenefit?.value?.limit && !freeDeliveryBenefit?.value?.maxFreeDeliveries;
  const maxFreeDeliveries = freeDeliveryBenefit?.value?.limit || freeDeliveryBenefit?.value?.maxFreeDeliveries || 0;
  const mealDiscountPct = mealDiscountBenefit?.value?.discountPercent || mealDiscountBenefit?.value?.amount || 0;
  const mealDiscountMinOrder = mealDiscountBenefit?.value?.conditions?.minOrderValue || mealDiscountBenefit?.value?.minOrderValue || 0;
  
  console.log('[CostProjection] Extracted values:', {
    mealDiscountPct,
    mealDiscountMinOrder
  });

  // Group schedule into delivery trips (same date+time)
  const grouped = {};
  sortSlots(schedule).forEach(slot => {
    const key = `${slot.dayOfWeek}|${slot.preferredTime || slot.mealTimeType}`;
    if (!grouped[key]) {
      grouped[key] = {
        dayOfWeek: slot.dayOfWeek,
        preferredTime: slot.preferredTime || slot.mealTimeType,
        items: []
      };
    }

    // Support multiple data formats
    const qtys = slot.fastFoodItemQtys && Object.keys(slot.fastFoodItemQtys).length
      ? slot.fastFoodItemQtys
      : slot.fastFoodItemIds?.length
        ? Object.fromEntries(slot.fastFoodItemIds.map(id => [id, 1]))
        : slot.fastFoodItemId ? { [slot.fastFoodItemId]: 1 }
        : slot.preferredFastFoodItemId ? { [slot.preferredFastFoodItemId]: 1 }
        : {};

    Object.entries(qtys).forEach(([id, qty]) => {
      const food = fastFoodItems.find(f => f.id === Number(id));
      if (food) {
        for (let q = 0; q < qty; q++) {
          grouped[key].items.push({
            foodId: food.id,
            foodName: food.name,
            basePrice: getCustomerPrice(food),
            sellerId: food.sellerId || 'unknown',
            deliveryFee: parseFloat(food.deliveryFee || FALLBACK_DELIVERY_FEE)
          });
        }
      }
    });
  });

  let freeMealsUsed = 0;
  let freeDeliveriesUsed = 0;
  let rawFood = 0;
  let rawDel = 0;
  let finalFood = 0;
  let finalDel = 0;

  const rows = [];

  Object.values(grouped).forEach((group, idx) => {
    const totalBase = group.items.reduce((s, i) => s + i.basePrice, 0);
    
    console.log(`[CostProjection] Processing group ${idx + 1}: totalBase=${totalBase}, minOrder=${mealDiscountMinOrder}, discountPct=${mealDiscountPct}`);

    // Calculate delivery fee with incremental vendor logic
    const vQty = {};
    const vFee = {};
    group.items.forEach(i => {
      vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
      if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
    });
    let calcDel = 0;
    Object.keys(vQty).forEach(v => {
      calcDel += vFee[v] + vFee[v] * INCREMENT_RATE * Math.max(0, vQty[v] - 1);
    });

    let rowFinalFood = 0;
    let rowFinalDel = calcDel;
    const benefitTags = [];

    // Apply food benefits
    group.items.forEach(item => {
      let price = item.basePrice;

      if (freeMealsUsed < maxFreeMeals) {
        const discount = maxMealValue > 0 ? Math.min(price, maxMealValue) : price;
        price = Math.max(0, price - discount);
        freeMealsUsed++;
        if (benefitTags.indexOf(`Free Meal (${freeMealsUsed}/${maxFreeMeals})`) === -1) {
          benefitTags.push(`Free Meal (${freeMealsUsed}/${maxFreeMeals})`);
        }
      } else if (mealDiscountPct > 0 && totalBase >= mealDiscountMinOrder) {
        // Only apply discount if order meets minimum requirement
        console.log(`[CostProjection] Applying discount: ${item.basePrice} -> ${item.basePrice * (1 - mealDiscountPct / 100)}`);
        price = Math.max(0, price * (1 - mealDiscountPct / 100));
        if (benefitTags.indexOf(`${mealDiscountPct}% Off Food`) === -1) {
          benefitTags.push(`${mealDiscountPct}% Off Food`);
        }
      } else if (mealDiscountPct > 0) {
        console.log(`[CostProjection] Discount NOT applied: totalBase ${totalBase} < minOrder ${mealDiscountMinOrder}`);
      }

      rowFinalFood += price;
    });

    // Apply delivery benefit
    if (hasFreeDelivery && (isFDUnlimited || freeDeliveriesUsed < maxFreeDeliveries)) {
      const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue
        || freeDeliveryBenefit.value?.minOrderValue || 0;
      if (totalBase >= minOrder) {
        const pct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
        if (pct > 0 && pct < 100) {
          rowFinalDel = Math.max(0, calcDel * (1 - pct / 100));
          freeDeliveriesUsed++;
          benefitTags.push(`${pct}% Off Delivery`);
        } else {
          rowFinalDel = 0;
          freeDeliveriesUsed++;
          benefitTags.push('Free Delivery');
        }
      }
    }

    if (benefitTags.length === 0) benefitTags.push('None');

    rawFood += totalBase;
    rawDel += calcDel;
    finalFood += rowFinalFood;
    finalDel += rowFinalDel;

    // Collapse duplicate items for display
    const collapsed = Object.values(
      group.items.reduce((acc, i) => {
        const key = i.foodId;
        if (!acc[key]) acc[key] = { foodName: i.foodName, basePrice: i.basePrice, qty: 0 };
        acc[key].qty += 1;
        return acc;
      }, {})
    );

    rows.push({
      schedule: `${group.dayOfWeek} ${group.preferredTime}`,
      items: collapsed.map(i => ({
        name: i.foodName,
        quantity: i.qty,
        unitPrice: i.basePrice,
        totalPrice: i.basePrice * i.qty
      })),
      baseFoodCost: totalBase,
      baseDeliveryFee: calcDel,
      benefitsApplied: benefitTags,
      finalFoodCost: rowFinalFood,
      finalDeliveryFee: rowFinalDel,
      finalTotal: rowFinalFood + rowFinalDel
    });
  });

  const savings = (rawFood + rawDel) - (finalFood + finalDel);

  return {
    billingCycle,
    generatedAt: new Date().toISOString(),
    frozenFoodItems, // Store frozen prices for historical reference
    rows,
    totals: {
      rawFoodCost: parseFloat(rawFood.toFixed(2)),
      rawDeliveryFee: parseFloat(rawDel.toFixed(2)),
      rawTotal: parseFloat((rawFood + rawDel).toFixed(2)),
      foodSavings: parseFloat((rawFood - finalFood).toFixed(2)),
      deliverySavings: parseFloat((rawDel - finalDel).toFixed(2)),
      totalSavings: parseFloat(savings.toFixed(2)),
      finalFoodCost: parseFloat(finalFood.toFixed(2)),
      finalDeliveryFee: parseFloat(finalDel.toFixed(2)),
      finalTotal: parseFloat((finalFood + finalDel).toFixed(2))
    },
    benefitsApplied: {
      freeMealsUsed,
      maxFreeMeals,
      freeDeliveriesUsed,
      maxFreeDeliveries: isFDUnlimited ? 'unlimited' : maxFreeDeliveries,
      mealDiscountPercent: mealDiscountPct
    }
  };
}

module.exports = {
  generateCostProjection,
  getCustomerPrice,
  sortSlots
};
