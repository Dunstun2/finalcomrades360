import React from 'react';

// Helper functions from MealPlanBuilder
const getCustomerPrice = (item) => {
  if (!item) return 0;
  const d = item.discountPrice ? Number(item.discountPrice) : 0;
  const p = item.displayPrice  ? Number(item.displayPrice)  : 0;
  const b = item.basePrice     ? Number(item.basePrice)     : 0;
  return d > 0 ? d : p > 0 ? p : b;
};

const DAY_ORDER = { monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:7 };
const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2 };

const sortSlots = (slots) =>
  [...slots].sort((a, b) => {
    const da = DAY_ORDER[a.dayOfWeek] ?? 99;
    const db = DAY_ORDER[b.dayOfWeek] ?? 99;
    if (da !== db) return da - db;
    return (MEAL_ORDER[a.mealTimeType] ?? 9) - (MEAL_ORDER[b.mealTimeType] ?? 9);
  });

/**
 * ScheduleProjectedCost Component - Mobile-Optimized table showing meal schedule and costs
 * 
 * Props:
 * - slots: Array of meal slots with food items
 * - fastFoodItems: Array of available food items
 * - activeBenefits: Array of benefits to apply
 * - title: Optional title (defaults to "Schedule & Projected Cost")
 * - description: Optional description
 * - billingCycle: Billing cycle for totals display (e.g., "weekly", "monthly")
 */
export default function ScheduleProjectedCost({ 
  slots = [], 
  fastFoodItems = [], 
  activeBenefits = [],
  title = "📊 Schedule & Projected Cost",
  description = "Preview of how benefits apply across the scheduled meals.",
  billingCycle = "Cycle"
}) {
  if (!slots || slots.length === 0) return null;

  const FALLBACK_FEE = 50;

  const freeMealsBenefit     = activeBenefits.find(b => (b.featureCode || b.feature?.code) === 'free_meals');
  const freeDeliveryBenefit  = activeBenefits.find(b =>
    ['free_delivery','reduced_delivery_fee'].includes(b.featureCode || b.feature?.code));
  const mealDiscountBenefit  = activeBenefits.find(b =>
    ['meal_discount', 'disc'].includes(b.featureCode || b.feature?.code));

  const maxFreeMeals          = freeMealsBenefit?.value?.limit || 0;
  const maxMealValue          = freeMealsBenefit?.value?.maxMealValue || 0;
  const hasFreeDelivery       = !!freeDeliveryBenefit;
  const isFDUnlimited         = !freeDeliveryBenefit?.value?.limit && !freeDeliveryBenefit?.value?.maxFreeDeliveries;
  const maxFreeDeliveries     = freeDeliveryBenefit?.value?.limit || freeDeliveryBenefit?.value?.maxFreeDeliveries || 0;
  const mealDiscountPct       = mealDiscountBenefit?.value?.discountPercent || mealDiscountBenefit?.value?.amount || 0;
  const mealDiscountMinOrder  = mealDiscountBenefit?.value?.conditions?.minOrderValue || mealDiscountBenefit?.value?.minOrderValue || 0;
  // Group into delivery trips (same date+time)
  const grouped = {};
  
  sortSlots(slots).forEach(slot => {
    const key = `${slot.dayOfWeek}|${slot.preferredTime}`;
    if (!grouped[key]) grouped[key] = { dayOfWeek: slot.dayOfWeek, preferredTime: slot.preferredTime, items: [] };
    
    // Support multiple data formats from different API responses
    let qtys = {};
    
    if (slot.fastFoodItemQtys && Object.keys(slot.fastFoodItemQtys).length) {
      qtys = slot.fastFoodItemQtys;
    } else if (slot.fastFoodItemIds?.length) {
      qtys = Object.fromEntries(slot.fastFoodItemIds.map(id => [id, (slot.fastFoodItemIds.filter(x => x === id).length)]));
    } else if (slot.fastFoodItemId) {
      qtys = { [slot.fastFoodItemId]: 1 };
    } else if (slot.preferredFastFoodItemId) {
      qtys = { [slot.preferredFastFoodItemId]: 1 };
    } else if (slot.FastFoodItem || slot.fastFoodItem) {
      const foodItem = slot.FastFoodItem || slot.fastFoodItem;
      qtys = { [foodItem.id]: 1 };
    }
    
    Object.entries(qtys).forEach(([id, qty]) => {
      let food = fastFoodItems.find(f => f.id === Number(id));
      if (!food) {
        food = slot.FastFoodItem || slot.fastFoodItem || slot.preferredFastFoodItem;
      }
      
      for (let q = 0; q < qty; q++) {
        grouped[key].items.push({ 
          _id: `${slot._id || slot.id}_${id}_${q}`, 
          food, 
          basePrice: getCustomerPrice(food), 
          sellerId: food?.sellerId || 'x', 
          deliveryFee: parseFloat(food?.deliveryFee || FALLBACK_FEE) 
        });
      }
    });
  });

  // Calculate all benefits once
  let freeMealsUsed = 0;
  let freeDeliveriesUsed = 0;
  let rawFood = 0, rawDel = 0, finalFood = 0, finalDel = 0;

  const processedRows = Object.values(grouped).map((group, idx) => {
    const totalBase = group.items.reduce((s, i) => s + i.basePrice, 0);

    // Calculate delivery fee
    const vQty = {}, vFee = {};
    group.items.forEach(i => {
      vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
      if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
    });
    let calcDel = 0;
    Object.keys(vQty).forEach(v => { 
      calcDel += vFee[v] + vFee[v] * 0.55 * Math.max(0, vQty[v] - 1); 
    });
    let rowFinalFood = 0;
    let rowFinalDel = calcDel;
    const tags = [];
    const tagKeys = new Set();

    // Apply food benefits
    group.items.forEach(item => {
      let price = item.basePrice;

      if (freeMealsUsed < maxFreeMeals) {
        const discount = maxMealValue > 0 ? Math.min(price, maxMealValue) : price;
        price = Math.max(0, price - discount);
        freeMealsUsed++;
        const tagKey = `fm-${freeMealsUsed}-${maxFreeMeals}`;
        if (!tagKeys.has(tagKey)) {
          tagKeys.add(tagKey);
          tags.push(
            <span key={tagKey} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 mr-1 mt-1">
              Free Meal ({freeMealsUsed}/{maxFreeMeals})
            </span>
          );
        }
      } else if (mealDiscountPct > 0 && totalBase >= mealDiscountMinOrder) {
        price = Math.max(0, price * (1 - mealDiscountPct / 100));
        if (!tagKeys.has('md')) {
          tagKeys.add('md');
          tags.push(<span key="md" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 mr-1 mt-1">{mealDiscountPct}% Off Food</span>);
        }
      }

      rowFinalFood += price;
    });

    // Apply delivery benefit
    if (hasFreeDelivery && (isFDUnlimited || freeDeliveriesUsed < maxFreeDeliveries)) {
      const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue || freeDeliveryBenefit.value?.minOrderValue || 0;
      if (totalBase >= minOrder) {
        const pct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
        if (pct > 0 && pct < 100) {
          rowFinalDel = Math.max(0, calcDel * (1 - pct / 100));
          freeDeliveriesUsed++;
          if (!tagKeys.has(`fd-${idx}`)) {
            tagKeys.add(`fd-${idx}`);
            tags.push(<span key={`fd-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 mr-1 mt-1">{pct}% Off Delivery</span>);
          }
        } else {
          rowFinalDel = 0; 
          freeDeliveriesUsed++;
          if (!tagKeys.has(`fd-${idx}`)) {
            tagKeys.add(`fd-${idx}`);
            tags.push(<span key={`fd-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 mr-1 mt-1">Free Delivery</span>);
          }
        }
      }
    }

    if (tags.length === 0) tags.push(<span key="none" className="text-gray-400 text-xs italic">None</span>);

    rawFood += totalBase; 
    rawDel += calcDel;
    finalFood += rowFinalFood; 
    finalDel += rowFinalDel;
    // Collapse duplicate items for display
    const collapsed = Object.values(
      group.items.reduce((acc, i) => {
        const key = i.food?.id ?? i._id;
        if (!acc[key]) acc[key] = { food: i.food, basePrice: i.basePrice, qty: 0 };
        acc[key].qty += 1;
        return acc;
      }, {})
    );

    return { 
      group, 
      collapsed, 
      totalBase, 
      calcDel, 
      rowFinalFood, 
      rowFinalDel, 
      tags,
      finalRowCost: rowFinalFood + rowFinalDel
    };
  });

  const savings = (rawFood + rawDel) - (finalFood + finalDel);

  return (
    <div className="mt-6 border-t pt-5">
      <h4 className="text-sm font-bold text-gray-800 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      
      {/* Mobile Layout - Card Format */}
      <div className="block sm:hidden space-y-3">
        {processedRows.map((rowData, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Schedule Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-gray-900 text-sm capitalize">
                {rowData.group.dayOfWeek} {rowData.group.preferredTime}
              </div>
              <div className="text-sm font-bold text-blue-600">
                KES {rowData.finalRowCost.toFixed(0)}
              </div>
            </div>
            
            {/* Food Items */}
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-500 mb-1">Items:</div>
              {rowData.collapsed.length > 0 ? rowData.collapsed.map((i, n) => (
                <div key={n} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-700">
                    {i.food?.name || 'Meal Item'}
                    {i.qty > 1 && <span className="ml-1 text-gray-400 font-normal">×{i.qty}</span>}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    KES {(i.basePrice * i.qty).toFixed(0)}
                  </span>
                </div>
              )) : (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-700">Meal Item</span>
                  <span className="text-sm font-medium text-gray-900">KES 150</span>
                </div>
              )}
            </div>
            {/* Cost Breakdown */}
            <div className="border-t border-gray-100 pt-3 mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Delivery:</span>
                <span>KES {rowData.calcDel.toFixed(0)}</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Benefits:</div>
              <div className="flex flex-wrap">{rowData.tags}</div>
            </div>
          </div>
        ))}

        {/* Mobile Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-600">Raw Food Total:</span>
              <span className="font-medium text-gray-900">KES {rawFood.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-600">Raw Delivery Total:</span>
              <span className="font-medium text-gray-900">KES {rawDel.toFixed(0)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="font-medium">Total Savings:</span>
                <span className="font-bold">- KES {savings.toFixed(0)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-base">
                <span className="font-bold text-gray-900">Final Total ({billingCycle}):</span>
                <span className="font-bold text-blue-600">KES {(finalFood + finalDel).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Layout - Responsive Table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Schedule','Item','Base Food','Delivery','Benefits Applied','Final Cost'].map(h => (
                <th key={h} className="px-2 lg:px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {processedRows.map((rowData, idx) => (
              <tr key={idx}>
                <td className="px-2 lg:px-3 py-2 text-xs text-gray-700 capitalize align-top whitespace-nowrap">
                  {rowData.group.dayOfWeek} {rowData.group.preferredTime}
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs font-medium text-gray-900 align-top">
                  {rowData.collapsed.length > 0 ? rowData.collapsed.map((i, n) => (
                    <div key={n}>
                      {i.food?.name || 'Meal Item'}
                      {i.qty > 1 && <span className="ml-1 text-gray-400 font-normal">×{i.qty}</span>}
                    </div>
                  )) : (
                    <div>Meal Item</div>
                  )}
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs text-gray-500 text-right align-top">
                  {rowData.collapsed.length > 0 ? rowData.collapsed.map((i, n) => (
                    <div key={n}>KES {(i.basePrice * i.qty).toFixed(0)}</div>
                  )) : (
                    <div>KES 150</div>
                  )}
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs text-gray-500 text-right align-top">
                  KES {rowData.calcDel.toFixed(0)}
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs align-top">
                  {rowData.tags}
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs font-bold text-gray-900 text-right align-top">
                  KES {rowData.finalRowCost.toFixed(0)}
                </td>
              </tr>
            ))}
            
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan="2" className="px-2 lg:px-3 py-2 text-xs font-semibold text-gray-600 text-right">Raw Totals:</td>
              <td className="px-2 lg:px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {rawFood.toFixed(0)}</td>
              <td className="px-2 lg:px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {rawDel.toFixed(0)}</td>
              <td /><td className="px-2 lg:px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {(rawFood+rawDel).toFixed(0)}</td>
            </tr>
            {savings > 0 && (
              <tr className="bg-green-50 border-t border-gray-200">
                <td colSpan="2" className="px-2 lg:px-3 py-2 text-xs font-medium text-green-700 text-right">Benefit Savings:</td>
                <td className="px-2 lg:px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {(rawFood-finalFood).toFixed(0)}</td>
                <td className="px-2 lg:px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {(rawDel-finalDel).toFixed(0)}</td>
                <td /><td className="px-2 lg:px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {savings.toFixed(0)}</td>
              </tr>
            )}
            <tr className={`${savings > 0 ? 'bg-blue-50' : 'bg-gray-50'} border-t-2 border-gray-300`}>
              <td colSpan="2" className="px-2 lg:px-3 py-3 text-sm font-bold text-gray-900 text-right">Final Totals (Entire Schedule):</td>
              <td className="px-2 lg:px-3 py-3 text-sm font-bold text-gray-900 text-right">KES {finalFood.toFixed(0)}</td>
              <td className="px-2 lg:px-3 py-3 text-sm font-bold text-gray-900 text-right">KES {finalDel.toFixed(0)}</td>
              <td /><td className="px-2 lg:px-3 py-3 text-sm font-bold text-blue-800 text-right">KES {(finalFood+finalDel).toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}