/**
 * MealPlanBuilder — shared component used by both the admin plan editor and the
 * customer custom-builder tab.
 *
 * Props
 * ─────
 * mode               'admin' | 'customer'   Controls which panels are visible.
 * initialSchedule    Array<slot>            Prepopulate slots when editing.
 * fastFoodItems      Array                  Pre-loaded food catalogue.
 * benefitPackages    Array                  Pre-loaded benefit packages.
 * loadingFoods       boolean
 * billingCycle       'weekly'|'monthly'
 * onBillingCycleChange (cycle) => void
 * planName           string
 * onPlanNameChange   (name) => void
 * description        string                 admin-only
 * onDescriptionChange (desc) => void        admin-only
 * selectedPackageId  number|null
 * onPackageChange    (id|null) => void
 * activeBenefits     Array                  Resolved benefits used for simulation
 *                                           (admin passes merged plan+package benefits)
 * onScheduleChange   (slots) => void        Notifies parent of slot mutations
 * onPriceChange      (total) => void        Notifies parent of computed price
 * onSubmit           (payload) => void      Called when the CTA button is clicked
 * isSubmitting       boolean
 * submitLabel        string                 Override CTA button text
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_TIMES = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' };
const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2 };
const DAY_ORDER = { monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:7 };

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
const getCustomerPrice = (item) => {
  if (!item) return 0;
  const d = item.discountPrice ? Number(item.discountPrice) : 0;
  const p = item.displayPrice  ? Number(item.displayPrice)  : 0;
  const b = item.basePrice     ? Number(item.basePrice)     : 0;
  return d > 0 ? d : p > 0 ? p : b;
};

const formatSlotDate = (str) => {
  if (!str) return '';
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  if (days.includes(str.toLowerCase()))
    return str.charAt(0).toUpperCase() + str.slice(1);
  try {
    const [y,m,d] = str.split('-');
    if (y && m && d) {
      return new Intl.DateTimeFormat('en-US', {
        weekday:'long', month:'long', day:'numeric', year:'numeric'
      }).format(new Date(+y, +m - 1, +d));
    }
  } catch { /* fall through */ }
  return str;
};

const newSlot = (dayOfWeek, mealTimeType) => ({
  _id: Math.random().toString(36).slice(2),
  dayOfWeek,
  mealTimeType,
  preferredTime: DEFAULT_TIMES[mealTimeType] || '12:00',
  // fastFoodItemQtys: { [itemId]: quantity } — supports multi-dish and quantities > 1
  fastFoodItemQtys: {},
});

const sortSlots = (slots) =>
  [...slots].sort((a, b) => {
    const da = DAY_ORDER[a.dayOfWeek] ?? 99;
    const db = DAY_ORDER[b.dayOfWeek] ?? 99;
    if (da !== db) return da - db;
    return (MEAL_ORDER[a.mealTimeType] ?? 9) - (MEAL_ORDER[b.mealTimeType] ?? 9);
  });

// ─────────────────────────────────────────────────────────────────────────────
// SimulationTable — admin-only per-slot benefit preview
// ─────────────────────────────────────────────────────────────────────────────
function SimulationTable({ slots, fastFoodItems, activeBenefits = [] }) {
  if (!slots || slots.length === 0) return null;

  const FALLBACK_FEE = 50;

  const freeMealsBenefit     = activeBenefits.find(b => (b.featureCode || b.feature?.code) === 'free_meals');
  const freeDeliveryBenefit  = activeBenefits.find(b =>
    ['free_delivery','reduced_delivery_fee'].includes(b.featureCode || b.feature?.code));
  // Check both 'meal_discount' and 'disc' feature codes
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
    // Support fastFoodItemQtys map (current), fastFoodItemIds array, or legacy single fastFoodItemId
    const qtys = slot.fastFoodItemQtys && Object.keys(slot.fastFoodItemQtys).length
      ? slot.fastFoodItemQtys
      : slot.fastFoodItemIds?.length
        ? Object.fromEntries(slot.fastFoodItemIds.map(id => [id, (slot.fastFoodItemIds.filter(x => x === id).length)]))
        : slot.fastFoodItemId ? { [slot.fastFoodItemId]: 1 } : {};
    Object.entries(qtys).forEach(([id, qty]) => {
      const food = fastFoodItems.find(f => f.id === Number(id));
      for (let q = 0; q < qty; q++) {
        grouped[key].items.push({ _id: `${slot._id}_${id}_${q}`, food, basePrice: getCustomerPrice(food), sellerId: food?.sellerId || 'x', deliveryFee: parseFloat(food?.deliveryFee || FALLBACK_FEE) });
      }
    });
  });

  let freeMealsUsed = 0;
  let freeDeliveriesUsed = 0;
  let rawFood = 0, rawDel = 0, finalFood = 0, finalDel = 0;

  const processedRows = Object.values(grouped).map((group, idx) => {
    const totalBase = group.items.reduce((s, i) => s + i.basePrice, 0);

    // Delivery fee with incremental vendor logic
    const vQty = {}, vFee = {};
    group.items.forEach(i => {
      vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
      if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
    });
    let calcDel = 0;
    Object.keys(vQty).forEach(v => { calcDel += vFee[v] + vFee[v] * 0.55 * Math.max(0, vQty[v] - 1); });

    let rowFinalFood = 0;
    let rowFinalDel  = calcDel;
    const tags = [];
    const tagKeys = new Set(); // deduplicate tag labels

    // Apply food benefits — one credit per item unit
    group.items.forEach(item => {
      let price = item.basePrice;

      if (freeMealsUsed < maxFreeMeals) {
        // One free-meal credit covers up to maxMealValue of this item
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
        // Meal discount applies only when order meets minimum requirement
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
        // Support both 'discountPercent' and 'amount' field names for compatibility
        const pct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
        if (pct > 0 && pct < 100) {
          rowFinalDel = Math.max(0, calcDel * (1 - pct / 100));
          freeDeliveriesUsed++;
          if (!tagKeys.has(`fd-${idx}`)) {
            tagKeys.add(`fd-${idx}`);
            tags.push(<span key={`fd-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 mr-1 mt-1">{pct}% Off Delivery</span>);
          }
        } else {
          rowFinalDel = 0; freeDeliveriesUsed++;
          if (!tagKeys.has(`fd-${idx}`)) {
            tagKeys.add(`fd-${idx}`);
            tags.push(<span key={`fd-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 mr-1 mt-1">Free Delivery</span>);
          }
        }
      }
    }

    if (tags.length === 0) tags.push(<span key="none" className="text-gray-400 text-xs italic">None</span>);

    rawFood   += totalBase; rawDel   += calcDel;
    finalFood += rowFinalFood; finalDel += rowFinalDel;

    // Collapse duplicate items into { food, basePrice, qty } for display
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
      <h4 className="text-sm font-bold text-gray-800 mb-1">📊 Schedule &amp; Projected Cost</h4>
      <p className="text-xs text-gray-500 mb-3">Preview of how benefits apply across the scheduled meals.</p>
      
      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-3">
        {processedRows.map((rowData, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-700 capitalize">
                📅 {rowData.group.dayOfWeek} {rowData.group.preferredTime}
              </span>
              <span className="text-sm font-bold text-gray-900">
                KES {rowData.finalRowCost.toFixed(0)}
              </span>
            </div>

            {/* Food list */}
            <div className="py-2 border-t border-gray-100 space-y-1">
              {rowData.collapsed.map((i, n) => (
                <div key={n} className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-800 font-medium truncate mr-2">
                    {i.food?.name || 'Meal Item'}
                    {i.qty > 1 && <span className="text-gray-400 font-normal ml-1">×{i.qty}</span>}
                  </span>
                  <span className="text-gray-500 whitespace-nowrap">
                    KES {(i.basePrice * i.qty).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Delivery fee & tags */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500">
                🚚 KES {rowData.calcDel.toFixed(0)}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {rowData.tags}
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Summary */}
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 mt-4">
          <div className="p-3 space-y-2 text-[11px]">
            <div className="flex justify-between text-gray-600">
              <span>Raw Food Cost:</span>
              <span>KES {rawFood.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Raw Delivery Fee:</span>
              <span>KES {rawDel.toFixed(0)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span>Savings:</span>
                <span>- KES {savings.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Final Total:</span>
              <span className="text-blue-800">KES {(finalFood + finalDel).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Table Layout */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Schedule','Item','Base Food','Delivery','Benefits Applied','Final Cost'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {processedRows.map((rowData, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-xs text-gray-700 capitalize align-top whitespace-nowrap">
                  {rowData.group.dayOfWeek} {rowData.group.preferredTime}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-900 align-top">
                  {rowData.collapsed.map((i, n) => (
                    <div key={n}>
                      {i.food?.name || 'Unknown'}
                      {i.qty > 1 && <span className="ml-1 text-gray-400 font-normal">×{i.qty}</span>}
                    </div>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 text-right align-top">
                  {rowData.collapsed.map((i, n) => (
                    <div key={n}>KES {(i.basePrice * i.qty).toFixed(0)}</div>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 text-right align-top">KES {rowData.calcDel.toFixed(0)}</td>
                <td className="px-3 py-2 text-xs align-top">{rowData.tags}</td>
                <td className="px-3 py-2 text-xs font-bold text-gray-900 text-right align-top">KES {rowData.finalRowCost.toFixed(0)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan="2" className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Raw Totals:</td>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {rawFood.toFixed(0)}</td>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {rawDel.toFixed(0)}</td>
              <td /><td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">KES {(rawFood+rawDel).toFixed(0)}</td>
            </tr>
            {savings > 0 && (
              <tr className="bg-green-50 border-t border-gray-200">
                <td colSpan="2" className="px-3 py-2 text-xs font-medium text-green-700 text-right">Benefit Savings:</td>
                <td className="px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {(rawFood-finalFood).toFixed(0)}</td>
                <td className="px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {(rawDel-finalDel).toFixed(0)}</td>
                <td /><td className="px-3 py-2 text-xs font-medium text-green-700 text-right">- KES {savings.toFixed(0)}</td>
              </tr>
            )}
            <tr className={`${savings > 0 ? 'bg-blue-50' : 'bg-gray-50'} border-t-2 border-gray-300`}>
              <td colSpan="2" className="px-3 py-3 text-sm font-bold text-gray-900 text-right">Final Totals (Per Cycle):</td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">KES {finalFood.toFixed(0)}</td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">KES {finalDel.toFixed(0)}</td>
              <td /><td className="px-3 py-3 text-sm font-bold text-blue-800 text-right">KES {(finalFood+finalDel).toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BenefitPackageDetail — shows benefit breakdown when a package is selected
// ─────────────────────────────────────────────────────────────────────────────
function BenefitPackageDetail({ pkg }) {
  if (!pkg || !pkg.benefits?.length) return null;

  const describe = (benefit) => {
    const name = benefit.feature?.name || benefit.featureName || benefit.featureCode || 'This feature';
    const val = benefit.value || {};

    if (benefit.limitType === 'counter') {
      const limit = val.limit ?? 0;
      const period = val.resetPeriod || 'monthly';
      const periodText = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
      return `The subscriber gets ${limit} ${name} every ${periodText}.`;
    }

    if (benefit.limitType === 'value') {
      const amount = val.amount ?? 0;
      const unit = val.unit || 'KES';
      return `The subscriber receives ${amount} ${unit} as ${name}.`;
    }

    if (benefit.limitType === 'rate') {
      const pct = val.discountPercent ?? 0;
      const minOrder = val.conditions?.minOrderValue;
      const maxLimit = val.maxDiscount;
      const limit = val.limit;
      const period = val.resetPeriod || 'monthly';
      const periodText = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';

      let parts = [`The subscriber receives a ${pct}% ${name}`];
      if (minOrder > 0) parts.push(`on orders over ${minOrder} KES`);
      if (maxLimit > 0) parts.push(`up to a maximum discount of ${maxLimit} KES`);
      if (limit > 0) parts.push(`, limited to ${limit} times per ${periodText}`);
      else parts.push(`, with unlimited usage`);
      return parts.join(' ') + '.';
    }

    if (benefit.limitType === 'boolean') {
      const enabled = val.enabled ?? true;
      if (!enabled) return `${name} is currently disabled.`;

      if (benefit.featureCode === 'free_delivery' || benefit.feature?.code === 'free_delivery') {
        const minOrder = val.conditions?.minOrderValue;
        const maxDeliveries = val.maxFreeDeliveries;
        const period = val.resetPeriod || 'monthly';
        let msg = `The subscriber gets free delivery`;
        if (minOrder > 0) msg += ` on orders over ${minOrder} KES`;
        if (maxDeliveries > 0) msg += `, limited to ${maxDeliveries} times per ${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}`;
        else msg += `, with unlimited usage`;
        return msg + '.';
      }

      const category = benefit.category || benefit.feature?.category || '';
      if (category === 'Support') {
        const rt = val.responseTime;
        const ch = Array.isArray(val.supportChannels) ? val.supportChannels.join(', ') : val.supportChannels;
        let msg = `The subscriber has Priority Support enabled`;
        if (rt || ch) msg += ` (`;
        if (rt) msg += `Response time: ${rt}`;
        if (rt && ch) msg += `, `;
        if (ch) msg += `Channels: ${ch}`;
        if (rt || ch) msg += `)`;
        return msg + '.';
      }

      const code = benefit.featureCode || benefit.feature?.code || '';
      if (code.includes('skip')) {
        const skips = val.skipsPerMonth;
        if (skips > 0) return `The subscriber is allowed to skip ${skips} meals per month.`;
        return `The subscriber is allowed to skip meals (unlimited skips).`;
      }

      return `${name} is enabled for this subscriber.`;
    }

    return 'Included.';
  };

  return (
    <div className="mt-3 bg-blue-100 border border-blue-200 rounded-lg p-4">
      <p className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">Included Benefits</p>
      <ul className="space-y-2">
        {pkg.benefits.map((b, i) => (
          <li key={i} className="flex flex-col bg-white/60 rounded px-3 py-2 border border-blue-200/50">
            <span className="text-sm font-semibold text-blue-900">{b.feature?.name || b.featureName || b.featureCode}</span>
            <span className="text-xs text-blue-700 mt-0.5">💡 <strong>Summary:</strong> {describe(b)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FoodPickerPanel — inline expandable food selector (appears below active slot)
// ─────────────────────────────────────────────────────────────────────────────
function FoodPickerPanel({ items, searchTerm, onSearchChange, category, onCategoryChange, categories, onChangeQty, selectedQtys = {}, activeSlotLabel, onClose, onRemoveSlot }) {
  const totalItems = Object.values(selectedQtys).reduce((s, q) => s + q, 0);

  return (
    <div className="border-t border-blue-200 bg-blue-50/50 p-4 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="flex flex-row gap-2 items-end justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide">Search dishes</label>
          <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search name, desc..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs p-2 border bg-white" />
        </div>
        <div className="space-y-1 w-28 sm:w-52 flex-shrink-0">
          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide">Category</label>
          <select value={category} onChange={e => onCategoryChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs p-2 border bg-white">
            <option value="all">All</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {activeSlotLabel && (
        <p className="text-xs text-blue-700 font-medium">
          Assigning to: <span className="font-bold">{activeSlotLabel}</span>
          {totalItems > 0 && (
            <span className="ml-2 text-blue-500 font-normal">· {totalItems} item{totalItems !== 1 ? 's' : ''} selected</span>
          )}
        </p>
      )}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {items.slice(0, 20).map(item => {
            const qty = selectedQtys[item.id] || 0;
            const isSelected = qty > 0;
            return (
              <div key={item.id}
                onClick={() => !isSelected && onChangeQty(item.id, +1)}
                className={`rounded-lg border p-2 text-xs transition-colors select-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-400'
                    : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                }`}>
                <p className="font-semibold text-blue-900">{item.name}</p>
                <p className="text-blue-700 mb-1">KES {getCustomerPrice(item)} · {item.category || 'Uncategorized'}</p>

                {/* Stepper — only visible once selected */}
                {isSelected && (
                  <div className="flex items-center gap-2 mt-1.5" onClick={e => e.stopPropagation()}>
                    <button type="button"
                      onClick={() => onChangeQty(item.id, -1)}
                      className="w-6 h-6 rounded-full border border-gray-300 bg-white text-gray-600 font-bold flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-colors">−</button>
                    <span className="w-5 text-center font-bold text-blue-800">{qty}</span>
                    <button type="button"
                      onClick={() => onChangeQty(item.id, +1)}
                      className="w-6 h-6 rounded-full border border-blue-400 bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-colors">+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-amber-600">No dishes match your filter.</p>
      )}

      {/* Done/Close Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={totalItems > 0 ? onClose : onRemoveSlot}
          className={`px-6 py-2.5 font-bold rounded-lg transition-colors text-sm shadow-md ${
            totalItems > 0 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          {totalItems > 0 ? '✓ Done' : 'Close'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MealPlanBuilder — main export
// ─────────────────────────────────────────────────────────────────────────────
export default function MealPlanBuilder({
  mode = 'customer',              // 'admin' | 'customer'

  // Plan metadata
  planName = '',
  onPlanNameChange,
  description = '',
  onDescriptionChange,            // admin only
  billingCycle = 'weekly',
  onBillingCycleChange,

  // Benefit package
  benefitPackages = [],
  selectedPackageId = null,
  onPackageChange,
  activeBenefits = [],            // used for simulation table (admin)

  // Food catalogue
  fastFoodItems = [],
  loadingFoods = false,

  // Slot state (can be controlled or uncontrolled)
  initialSchedule = [],
  onScheduleChange,               // (slots) => void — fired on every mutation
  onPriceChange,                  // (total) => void

  // Submission
  onSubmit,
  isSubmitting = false,
  submitLabel,
}) {
  const isAdmin = mode === 'admin';

  // ── Slot state ─────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState(() =>
    (initialSchedule || []).map(s => {
      // If already has fastFoodItemQtys, use as-is
      if (s.fastFoodItemQtys && Object.keys(s.fastFoodItemQtys).length) {
        return { ...s, _id: s._id || Math.random().toString(36).slice(2) };
      }
      // Convert fastFoodItemIds[] (flat, ids repeated for qty) → fastFoodItemQtys{}
      const ids = s.fastFoodItemIds?.length
        ? s.fastFoodItemIds
        : s.fastFoodItemId ? [s.fastFoodItemId] : [];
      const qtys = ids.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      return { ...s, _id: s._id || Math.random().toString(36).slice(2), fastFoodItemQtys: qtys };
    })
  );
  const [activeSlotId, setActiveSlotId] = useState(null);

  // ── New-slot picker row state ───────────────────────────────────────────────
  const [newDate, setNewDate]     = useState('');
  const [newMeal, setNewMeal]     = useState('');


  // ── Food search / filter state ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // ── Validation errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  // ── Sync slots upward whenever they change ─────────────────────────────────
  const updateSlots = useCallback((next) => {
    setSlots(next);
    onScheduleChange?.(next);
  }, [onScheduleChange]);

  // ── Recompute price whenever slots or food list changes ────────────────────
  useEffect(() => {
    const total = slots.reduce((sum, slot) => {
      const qtys = slot.fastFoodItemQtys || {};
      return sum + Object.entries(qtys).reduce((s, [id, qty]) => {
        const item = fastFoodItems.find(f => f.id === Number(id));
        return s + getCustomerPrice(item) * qty;
      }, 0);
    }, 0);
    const multiplier = billingCycle === 'monthly' ? 4 : 1;
    onPriceChange?.(parseFloat((total * multiplier).toFixed(2)));
  }, [slots, fastFoodItems, billingCycle, onPriceChange]);

  // Auto-select first slot if current active was removed
  useEffect(() => {
    if (slots.length === 0) { setActiveSlotId(null); return; }
    if (!slots.some(s => s._id === activeSlotId)) setActiveSlotId(slots[0]._id);
  }, [slots]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const foodCategories = useMemo(() =>
    Array.from(new Set(fastFoodItems.map(i => (i.category || 'Uncategorized').trim()).filter(Boolean))),
    [fastFoodItems]);

  const filteredFoods = useMemo(() =>
    fastFoodItems.filter(item => {
      const q = searchTerm.trim().toLowerCase();
      const matchQ = !q || `${item.name||''} ${item.shortDescription||''} ${item.category||''}`
        .toLowerCase().includes(q);
      const matchC = filterCategory === 'all' || (item.category || 'Uncategorized') === filterCategory;
      return matchQ && matchC;
    }), [fastFoodItems, searchTerm, filterCategory]);

  const displayPrice = useMemo(() => {
    const FALLBACK_FEE = 50;
    const INCREMENT_RATE = 0.55;

    // Get benefits from selected package or use activeBenefits (admin)
    const selectedPkg = benefitPackages.find(p => p.id === selectedPackageId);
    const benefits = selectedPkg?.benefits || activeBenefits || [];

    // Extract benefit config (same logic as SimulationTable)
    const freeMealsBenefit    = benefits.find(b => (b.featureCode || b.feature?.code) === 'free_meals');
    const freeDeliveryBenefit = benefits.find(b =>
      ['free_delivery', 'reduced_delivery_fee'].includes(b.featureCode || b.feature?.code));
    const mealDiscountBenefit = benefits.find(b =>
      ['meal_discount', 'disc'].includes(b.featureCode || b.feature?.code));

    const maxFreeMeals      = freeMealsBenefit?.value?.limit || 0;
    const maxMealValue      = freeMealsBenefit?.value?.maxMealValue || 0;
    const hasFreeDelivery   = !!freeDeliveryBenefit;
    const isFDUnlimited     = !freeDeliveryBenefit?.value?.limit && !freeDeliveryBenefit?.value?.maxFreeDeliveries;
    const maxFreeDeliveries = freeDeliveryBenefit?.value?.limit || freeDeliveryBenefit?.value?.maxFreeDeliveries || 0;
    const mealDiscountPct   = mealDiscountBenefit?.value?.discountPercent || mealDiscountBenefit?.value?.amount || 0;
    const mealDiscountMin   = mealDiscountBenefit?.value?.conditions?.minOrderValue || mealDiscountBenefit?.value?.minOrderValue || 0;

    // Group slots by delivery trip (same day+time)
    const grouped = {};
    slots.forEach(slot => {
      const key = `${slot.dayOfWeek}|${slot.preferredTime || slot.mealTimeType}`;
      if (!grouped[key]) grouped[key] = [];
      Object.entries(slot.fastFoodItemQtys || {}).forEach(([id, qty]) => {
        const food = fastFoodItems.find(f => f.id === Number(id));
        if (food) {
          for (let q = 0; q < qty; q++) {
            grouped[key].push({ food, basePrice: getCustomerPrice(food), sellerId: food.sellerId || 'x', deliveryFee: parseFloat(food.deliveryFee || FALLBACK_FEE) });
          }
        }
      });
    });

    let freeMealsUsed = 0;
    let freeDeliveriesUsed = 0;
    let finalFood = 0;
    let finalDel = 0;

    Object.values(grouped).forEach(items => {
      if (items.length === 0) return;
      const totalBase = items.reduce((s, i) => s + i.basePrice, 0);

      // Delivery fee
      const vQty = {}, vFee = {};
      items.forEach(i => {
        vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
        if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
      });
      let calcDel = 0;
      Object.keys(vQty).forEach(v => { calcDel += vFee[v] + vFee[v] * INCREMENT_RATE * Math.max(0, vQty[v] - 1); });

      // Food benefits
      let rowFood = 0;
      items.forEach(item => {
        let price = item.basePrice;
        if (freeMealsUsed < maxFreeMeals) {
          const discount = maxMealValue > 0 ? Math.min(price, maxMealValue) : price;
          price = Math.max(0, price - discount);
          freeMealsUsed++;
        } else if (mealDiscountPct > 0 && totalBase >= mealDiscountMin) {
          price = Math.max(0, price * (1 - mealDiscountPct / 100));
        }
        rowFood += price;
      });

      // Delivery benefit
      let rowDel = calcDel;
      if (hasFreeDelivery && (isFDUnlimited || freeDeliveriesUsed < maxFreeDeliveries)) {
        const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue || freeDeliveryBenefit.value?.minOrderValue || 0;
        if (totalBase >= minOrder) {
          const pct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
          rowDel = (pct > 0 && pct < 100) ? Math.max(0, calcDel * (1 - pct / 100)) : 0;
          freeDeliveriesUsed++;
        }
      }

      finalFood += rowFood;
      finalDel  += rowDel;
    });

    const total = finalFood + finalDel;
    return parseFloat((total * (billingCycle === 'monthly' ? 4 : 1)).toFixed(2));
  }, [slots, fastFoodItems, benefitPackages, selectedPackageId, activeBenefits, billingCycle]);

  // Group slots by date for rendering
  const groupedSlots = useMemo(() => {
    const groups = {};
    sortSlots(slots).forEach(s => {
      if (!groups[s.dayOfWeek]) groups[s.dayOfWeek] = [];
      groups[s.dayOfWeek].push(s);
    });
    return groups;
  }, [slots]);

  const sortedDateKeys = useMemo(() =>
    Object.keys(groupedSlots).sort((a, b) => {
      const da = DAY_ORDER[a] ?? a;
      const db = DAY_ORDER[b] ?? b;
      if (typeof da === 'number' && typeof db === 'number') return da - db;
      return String(a).localeCompare(String(b));
    }), [groupedSlots]);

  const activeSlot = slots.find(s => s._id === activeSlotId);

  // ── Slot mutations ─────────────────────────────────────────────────────────
  const addSlot = () => {
    if (!newDate) return;
    const s = newSlot(newDate, newMeal);
    const next = [s, ...slots];
    updateSlots(next);
    setActiveSlotId(s._id);
    // Reset fields after adding slot
    setNewDate('');
    setNewMeal('');
  };

  const removeSlot = (id) => {
    updateSlots(slots.filter(s => s._id !== id));
    if (activeSlotId === id) setActiveSlotId(null);
  };

  const updateSlotField = (id, field, value) =>
    updateSlots(slots.map(s => s._id === id ? { ...s, [field]: value } : s));

  // Change quantity of a food item for the active slot (delta = +1 or -1, 0 removes)
  const changeFoodQty = useCallback((foodId, delta) => {
    if (!activeSlotId) return;
    updateSlots(slots.map(s => {
      if (s._id !== activeSlotId) return s;
      const current = { ...(s.fastFoodItemQtys || {}) };
      const next = (current[foodId] || 0) + delta;
      if (next <= 0) {
        delete current[foodId];
      } else {
        current[foodId] = next;
      }
      return { ...s, fastFoodItemQtys: current };
    }));
  }, [activeSlotId, slots]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    // Validate required fields before sending
    const newErrors = {};
    if (isAdmin && !planName?.trim()) {
      newErrors.planName = 'Plan name is required';
    }
    if (slots.length === 0) {
      newErrors.slots = 'Add at least one meal slot';
    } else if (slots.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)) {
      newErrors.slots = 'Every slot must have at least one dish assigned';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit?.({
      name: planName,
      description,
      billingCycle: billingCycle || 'weekly', // duration of the plan period; not auto-renewal
      // Expand qtys map back to flat array with repeats so backend gets one id per unit
      templateSchedule: slots.map(({ _id, fastFoodItemId: _l, fastFoodItemIds: _li, fastFoodItemQtys, ...rest }) => ({
        ...rest,
        fastFoodItemIds: Object.entries(fastFoodItemQtys || {}).flatMap(([id, qty]) =>
          Array(qty).fill(Number(id))
        ),
      })),
      benefitPackageId: selectedPackageId || null,
    });
  };

  const selectedPackage = benefitPackages.find(p => p.id === selectedPackageId);

  // ── Slot options helper: keep currently assigned items visible even if filtered out
  const slotFoodOptions = (slot) => {
    const ids = Object.keys(slot.fastFoodItemQtys || {}).map(Number);
    const selectedItems = ids
      .map(id => fastFoodItems.find(i => i.id === id))
      .filter(Boolean)
      .filter(item => !filteredFoods.some(i => i.id === item.id));
    return [...selectedItems, ...filteredFoods];
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. Plan Details ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
          {isAdmin ? 'Plan Details' : '1. Plan Details'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Plan name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name {!isAdmin && <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <input
              type="text"
              value={planName}
              onChange={e => { onPlanNameChange?.(e.target.value); setErrors(prev => ({ ...prev, planName: undefined })); }}
              placeholder={isAdmin ? 'e.g. Weekly Breakfast Bundle' : `My Meal Plan – ${new Date().toLocaleDateString()}`}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.planName ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>

          {/* Description — admin only */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} value={description}
                onChange={e => onDescriptionChange?.(e.target.value)}
                placeholder="Short description shown to customers"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Meal Schedule Builder ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
          {isAdmin ? 'Meal Schedule' : `${benefitPackages.length > 0 ? '3' : '2'}. Configure Meal Schedule`}
        </h3>
        <p className="text-xs text-gray-500 mb-4">Pick a date and meal time, then assign a dish to each slot.</p>

        {loadingFoods ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-4">

            {/* Slots grouped by date */}
            {slots.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No slots yet. Pick a date and add one below.</p>
            ) : (
              <div className="space-y-3">
                {sortedDateKeys.map(dateKey => {
                  const daySlots = groupedSlots[dateKey];
                  return (
                    <div key={dateKey} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Date header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h4 className="font-bold text-gray-900 text-sm">{formatSlotDate(dateKey)}</h4>
                        <div className="flex items-center gap-3">
                          <button type="button"
                            onClick={() => {
                              const s = newSlot(dateKey, 'lunch');
                              const next = [s, ...slots];
                              updateSlots(next);
                              setActiveSlotId(s._id);
                            }}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded font-semibold">
                            + Add Dish
                          </button>
                          <span className="text-xs text-gray-500">
                            {daySlots.length} meal{daySlots.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Slots */}
                      <div className="divide-y divide-gray-100">
                        {daySlots.map(slot => {
                          const qtys = slot.fastFoodItemQtys || {};
                          const selectedDishes = Object.entries(qtys)
                            .map(([id, qty]) => ({ dish: fastFoodItems.find(i => i.id === Number(id)), qty }))
                            .filter(({ dish }) => dish);
                          const isActive = activeSlotId === slot._id;

                          return (
                            <React.Fragment key={slot._id}>
                              {/* Slot row */}
                              <div
                                onClick={() => setActiveSlotId(isActive ? null : slot._id)}
                                className={`p-4 space-y-3 cursor-pointer transition-colors ${
                                  isActive ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold capitalize text-gray-900">{slot.mealTimeType}</span>
                                      <span className="text-xs text-gray-500">{slot.preferredTime}</span>
                                      {isActive && (
                                        <span className="text-xs bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-semibold">SELECTED</span>
                                      )}
                                    </div>

                                    {/* Selected dish chips with qty */}
                                    {selectedDishes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {selectedDishes.map(({ dish, qty }) => (
                                          <span key={dish.id}
                                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200">
                                            {dish.name}
                                            {qty > 1 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0 rounded-full">×{qty}</span>}
                                            <span className="text-blue-500">· KES {(getCustomerPrice(dish) * qty).toFixed(0)}</span>
                                            <button
                                              type="button"
                                              onClick={e => { e.stopPropagation(); changeFoodQty(dish.id, -qty); setActiveSlotId(slot._id); }}
                                              className="ml-0.5 text-blue-400 hover:text-red-500 font-bold leading-none"
                                              title={`Remove ${dish.name}`}>×</button>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs mt-1.5 text-amber-600">No dish assigned — click to pick</p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Time picker */}
                                    <input type="time"
                                      value={slot.preferredTime}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => { e.stopPropagation(); updateSlotField(slot._id, 'preferredTime', e.target.value); }}
                                      className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button type="button"
                                      onClick={e => { e.stopPropagation(); removeSlot(slot._id); }}
                                      className="text-red-400 hover:text-red-600 font-bold text-base leading-none"
                                      title="Remove slot">✕</button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded food picker — appears below the active slot */}
                              {isActive && (
                                <FoodPickerPanel
                                  items={filteredFoods}
                                  searchTerm={searchTerm}
                                  onSearchChange={setSearchTerm}
                                  category={filterCategory}
                                  onCategoryChange={setFilterCategory}
                                  categories={foodCategories}
                                  onChangeQty={changeFoodQty}
                                  selectedQtys={qtys}
                                  activeSlotLabel={`${formatSlotDate(slot.dayOfWeek)} — ${slot.mealTimeType}`}
                                  onClose={() => setActiveSlotId(null)}
                                  onRemoveSlot={() => removeSlot(slot._id)}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add slot row (rendered at the bottom, only when not editing a slot) */}
            {!activeSlotId && (
              <div className="flex flex-col sm:flex-row items-end gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm p-2.5 border bg-white focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Meal Time</label>
                  <select value={newMeal} onChange={e => setNewMeal(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm p-2.5 border bg-white focus:border-blue-500 focus:ring-blue-500">
                    <option value="">Select meal time...</option>
                    {MEAL_TIMES.map(mt => <option key={mt} value={mt} className="capitalize">{mt}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => { addSlot(); setErrors(prev => ({ ...prev, slots: undefined })); }} disabled={!newDate || !newMeal}
                  className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  + Add Slot
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Benefit Package — sits just above Schedule & Projected Cost ── */}
      {benefitPackages.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
            {isAdmin ? 'Benefit Package' : 'Add a Benefit Package (Optional)'}
          </h3>
          <select
            value={selectedPackageId || ''}
            onChange={e => onPackageChange?.(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No package (standard plan)</option>
            {benefitPackages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} — {pkg.benefits?.length || 0} benefits
              </option>
            ))}
          </select>

          {/* Full benefit detail */}
          {selectedPackage && <BenefitPackageDetail pkg={selectedPackage} />}
        </div>
      )}

      {/* ── Simulation table — always shows when slots exist, with or without benefits ── */}
      {slots.length > 0 && (
        <SimulationTable
          slots={slots}
          fastFoodItems={fastFoodItems}
          activeBenefits={selectedPackage?.benefits || []}
        />
      )}

      {/* ── Validation summary — shown just above CTA when there are errors ── */}
      {Object.values(errors).filter(Boolean).length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">Please fix the following before saving:</p>
          <ul className="space-y-1">
            {Object.values(errors).filter(Boolean).map((msg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                <span className="mt-0.5 flex-shrink-0">•</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 5. CTA bar ── */}
      {submitLabel && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white text-3xl font-extrabold">KES {Math.round(displayPrice)}</p>
            {slots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length > 0 && (
              <p className="text-amber-300 text-sm mt-1">
                <span>({slots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length} slot{slots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length !== 1 ? 's' : ''} without a dish)</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || slots.length === 0 || slots.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)}
            className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl shadow-xl hover:bg-blue-50 transition-all text-lg disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? 'Saving…' : (submitLabel || (isAdmin ? 'Save Plan' : 'Create My Meal Plan →'))}
          </button>
        </div>
      )}
    </div>
  );
}
