# Discount Min Order Value - Fix Summary

## Problem Identified

The 6% discount benefit with the condition "on orders over 800 KES" was **NOT being enforced**. Discounts were being applied to ALL orders regardless of the total amount.

## Root Causes Found

### 1. Missing Min Order Value Check (FIXED ✅)
**File:** `backend/modules/subscriptions/services/MealSubscriptionService.js`

**Problem:** The code was applying the discount without checking `minOrderValue`:
```javascript
// OLD CODE - WRONG
if (!usedFreeMeal && mealDiscountPct > 0) {
   const discountAmount = (item.basePrice * mealDiscountPct) / 100;
   itemPrice = Math.max(0, item.basePrice - discountAmount);
}
```

**Fix Applied:**
```javascript
// NEW CODE - CORRECT
if (!usedFreeMeal && mealDiscountPct > 0) {
   const minOrderForDiscount = mealDiscountBenefit.value?.conditions?.minOrderValue || mealDiscountBenefit.value?.minOrderValue || 0;
   if (totalBaseFoodPrice >= minOrderForDiscount) {
      const discountAmount = (item.basePrice * mealDiscountPct) / 100;
      itemPrice = Math.max(0, item.basePrice - discountAmount);
   }
}
```

### 2. Wrong Feature Code (FIXED ✅)
**File:** `backend/modules/subscriptions/services/MealSubscriptionService.js`

**Problem:** The code was only checking for `meal_discount` feature code, but the actual benefit in the database uses feature code `disc`.

**Database Evidence:**
```javascript
// Features table
{
  code: 'disc',
  name: 'Discount',
  category: 'Finance'
}

// Benefit Package "Meal Pro"
"disc": {
  "limit": 1,
  "discountPercent": 6,
  "conditions": {
    "minOrderValue": 800
  }
}
```

**Fix Applied:**
```javascript
// Check for BOTH feature codes
const mealDiscountBenefit = await BenefitService.getActiveBenefit(sub, 'meal_discount') || 
                            await BenefitService.getActiveBenefit(sub, 'disc');
```

## How It Works Now

### Benefit Structure
```json
{
  "discountPercent": 6,
  "conditions": {
    "minOrderValue": 800
  },
  "limit": 1
}
```

### Discount Application Logic

1. **Calculate Total Order Value** (before discounts)
   ```javascript
   let totalBaseFoodPrice = 0;
   for (const item of items) {
     totalBaseFoodPrice += item.basePrice;
   }
   ```

2. **Check if Benefit Exists**
   ```javascript
   const mealDiscountBenefit = await BenefitService.getActiveBenefit(sub, 'meal_discount') || 
                               await BenefitService.getActiveBenefit(sub, 'disc');
   ```

3. **Extract Discount Percentage**
   ```javascript
   const mealDiscountPct = mealDiscountBenefit?.value?.discountPercent || 
                           mealDiscountBenefit?.value?.amount || 0;
   ```

4. **Check Min Order Requirement**
   ```javascript
   const minOrderForDiscount = mealDiscountBenefit.value?.conditions?.minOrderValue || 
                               mealDiscountBenefit.value?.minOrderValue || 0;
   
   if (totalBaseFoodPrice >= minOrderForDiscount) {
     // Apply discount
   } else {
     // Skip discount - order too small
   }
   ```

5. **Apply Discount Per Item**
   ```javascript
   for (const item of itemsData) {
     if (totalBaseFoodPrice >= minOrderForDiscount) {
       const discountAmount = (item.basePrice * mealDiscountPct) / 100;
       item.finalPrice = item.basePrice - discountAmount;
     } else {
       item.finalPrice = item.basePrice; // No discount
     }
   }
   ```

## Example Scenarios

### Scenario 1: Order Qualifies ✅
- **Order Items Total:** KES 1,245
- **Delivery Fee:** KES 65
- **Food Subtotal:** KES 1,180
- **Min Order Required:** KES 800
- **Discount:** 6%
- **Check:** 1,180 >= 800 ✅
- **Result:** 6% discount applied
- **Savings:** KES 70.80 (6% of 1,180)

### Scenario 2: Order Below Minimum ❌
- **Order Items Total:** KES 750
- **Min Order Required:** KES 800
- **Check:** 750 < 800 ❌
- **Result:** NO discount applied
- **Savings:** KES 0

### Scenario 3: Order Exactly at Minimum ✅
- **Order Items Total:** KES 800
- **Min Order Required:** KES 800
- **Check:** 800 >= 800 ✅
- **Result:** 6% discount applied
- **Savings:** KES 48 (6% of 800)

## Debug Logging Added

When meal orders are generated, you'll now see:
```
[MealGen] Subscription 123 benefits check:
  - Free Meals: false
  - Free Delivery: true
  - Meal Discount: true
  - Meal Discount Details: {"discountPercent":6,"conditions":{"minOrderValue":800},"limit":1}

[MealGen] Discount check: totalBaseFoodPrice=1245, minOrder=800, discountPct=6
[MealGen] Discount applied: 234 -> 220.04 (saved 13.96)
[MealGen] Discount applied: 180 -> 169.2 (saved 10.8)
...
```

Or if order is too small:
```
[MealGen] Discount check: totalBaseFoodPrice=500, minOrder=800, discountPct=6
[MealGen] Discount NOT applied: order total below minimum
```

## Testing Instructions

### 1. Restart Backend Server
```bash
# Stop current backend
# Restart: npm run dev (or your start command)
```

### 2. Create Test Order
1. User must have active subscription with "Meal Pro" package
2. Create meal order with:
   - **Test A:** Total >= KES 800 (should get 6% discount)
   - **Test B:** Total < KES 800 (should NOT get discount)

### 3. Check Logs
Look for console output:
- Benefit detection
- Discount calculation
- Min order check result

### 4. Verify Order Total
- Check final order `total` field
- Verify discount was applied (or not) correctly

## Related Benefits

The same min order check pattern should be applied to:

1. **Cashback** (`cashback_orders`) - ✅ Already implemented
   ```javascript
   if (orderSubtotal >= minOrderValue) {
     // Credit cashback
   }
   ```

2. **Reduced Delivery Fee** (`reduced_delivery_fee`) - ✅ Already implemented
   ```javascript
   const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue || 0;
   if (totalBaseFoodPrice >= minOrder) {
     // Apply delivery discount
   }
   ```

## Files Modified

1. ✅ `backend/modules/subscriptions/services/MealSubscriptionService.js`
   - Added min order value check for discounts
   - Added support for `disc` feature code
   - Added debug logging

2. ✅ `backend/modules/subscriptions/services/CashbackService.js`
   - Already had min order check
   - Uses correct `cashback_orders` feature code

3. ✅ `backend/modules/orders/models/Order.js`
   - Added `cashbackProcessed` field
   - Added `cashbackAmount` field

4. ✅ `backend/migrations/20260706231702-add-cashback-fields-to-orders.js`
   - Migration for cashback fields

## Next Steps

1. **Restart Backend** - Changes require server restart to take effect
2. **Test with Real Order** - Create meal order >= KES 800 to verify discount
3. **Monitor Logs** - Check console for benefit application messages
4. **Verify Database** - Confirm final order amounts are correct

## Summary

✅ Min order value check now enforced for discounts
✅ Support for both `meal_discount` and `disc` feature codes
✅ Cashback benefit fully implemented with min order checks
✅ Debug logging added for troubleshooting
✅ Documentation complete

**The discount will now ONLY apply when the order total meets or exceeds the minimum order value configured in the benefit package.**
