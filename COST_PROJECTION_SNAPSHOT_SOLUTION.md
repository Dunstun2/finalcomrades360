# Cost Projection Snapshot Solution

## Problem Statement

The customer subscription page was **recalculating** the "Schedule & Projected Cost" table on-the-fly, which could result in different values than what was shown when the subscription was created. The customer should see the **exact same breakdown** that was displayed at subscription creation time.

## Solution Overview

Implemented a **snapshot system** that:
1. **Saves** the exact cost breakdown table when a subscription is created
2. **Stores** it in the database with the subscription
3. **Displays** the saved snapshot to customers (no recalculation)

---

## Implementation Details

### 1. Database Schema Changes

**Added Field**: `costProjectionSnapshot` (JSON) to `Subscription` table

```javascript
costProjectionSnapshot: {
  type: DataTypes.JSON,
  allowNull: true,
  comment: 'Stores the pre-calculated cost breakdown including delivery fees, benefits, and totals'
}
```

**Migration**: `20260707_add_cost_projection_snapshot.js`
- Adds the JSON column to store cost projection data
- Database-agnostic (works with SQLite and MySQL)
- Status: ✅ Successfully run

---

### 2. Backend Changes

#### A. Cost Projection Calculator (`backend/modules/subscriptions/utils/costProjectionCalculator.js`)

New utility module that generates the exact cost breakdown structure:

```javascript
{
  billingCycle: 'weekly',
  generatedAt: '2026-07-07T...',
  rows: [
    {
      schedule: 'Monday 08:00',
      items: [{ name: 'Kitheri moto Bhajia', quantity: 1, unitPrice: 40, totalPrice: 40 }],
      baseFoodCost: 40,
      baseDeliveryFee: 23,
      benefitsApplied: ['None'],
      finalFoodCost: 40,
      finalDeliveryFee: 23,
      finalTotal: 63
    }
    // ... more rows
  ],
  totals: {
    rawFoodCost: 1048,
    rawDeliveryFee: 70,
    rawTotal: 1118,
    foodSavings: 0,
    deliverySavings: 17,
    totalSavings: 17,
    finalFoodCost: 1048,
    finalDeliveryFee: 53,
    finalTotal: 1101
  },
  benefitsApplied: {
    freeMealsUsed: 0,
    maxFreeMeals: 4,
    freeDeliveriesUsed: 3,
    maxFreeDeliveries: 'unlimited',
    mealDiscountPercent: 10
  }
}
```

**Key Features**:
- Calculates delivery fees with vendor-based incremental logic (55% per additional item)
- Applies benefits in correct order (free meals → meal discounts → delivery discounts)
- Tracks benefit usage counters
- Groups schedule by delivery time for accurate fee calculation
- Supports multiple food item formats (fastFoodItemIds, fastFoodItemId, etc.)

#### B. Subscription Creation (`backend/modules/subscriptions/services/SubscriptionEngine.js`)

Updated the `subscribe()` method to generate and save snapshot:

```javascript
// After creating subscription record
const sub = await Subscription.create(subData, { transaction: t });

// Generate cost projection snapshot for meal subscriptions
if (scheduleToCreate && scheduleToCreate.length > 0 && (plan?.type === 'meal' || isCustomMeal)) {
  const costProjection = await generateCostProjection(
    scheduleToCreate,
    foodItems,
    benefits,
    billingCycle
  );
  
  if (costProjection) {
    sub.costProjectionSnapshot = costProjection;
    await sub.save({ transaction: t });
  }
}
```

**When Snapshot is Generated**:
- ✅ Meal plan subscriptions (with schedule)
- ✅ Custom meal plans created by users
- ✅ Admin-created meal plans
- ❌ Non-meal subscriptions (seller, service, etc.)

---

### 3. Frontend Changes

#### A. Saved Cost Projection Table Component (`frontend/src/shared/components/SavedCostProjectionTable.jsx`)

New component that displays the saved snapshot:

**Features**:
- Displays exact breakdown from snapshot (no calculation)
- Shows all benefit tags as they were applied
- Color-coded benefit indicators:
  - 🟢 Green: Free meals
  - 🟣 Purple: Delivery discounts
  - 🔵 Blue: Food discounts
- Shows savings breakdown if applicable
- Displays benefits usage summary
- Timestamps when the cost was calculated

#### B. Customer Subscriptions Page (`frontend/src/modules/users/pages/CustomerSubscriptions.jsx`)

Updated to prioritize saved snapshot:

```javascript
// Priority 1: Use saved snapshot if available
if (subscription.costProjectionSnapshot) {
  return <SavedCostProjectionTable snapshot={subscription.costProjectionSnapshot} />;
}

// Priority 2: Fallback to dynamic calculation for legacy subscriptions
return <ScheduleProjectedCost slots={schedule} benefits={benefits} />;
```

**Backward Compatibility**:
- New subscriptions: Show saved snapshot
- Legacy subscriptions: Calculate on-the-fly (with notice)
- Missing data: Show helpful error message

---

## Comparison: Before vs After

### Before (Recalculated)
```
Customer visits /customer/subscriptions
  ↓
Fetch subscription data
  ↓
Fetch schedule entries
  ↓
Fetch food items
  ↓
Fetch benefits
  ↓
Calculate costs IN REAL-TIME
  ↓
Display table (may differ from creation time)
```

**Problems**:
- ❌ Results could differ if food prices changed
- ❌ Results could differ if benefits were modified
- ❌ Delivery fee calculation might vary
- ❌ Extra API calls and processing time

### After (Snapshot)
```
Customer visits /customer/subscriptions
  ↓
Fetch subscription data (includes snapshot)
  ↓
Display saved snapshot
  ✅ DONE
```

**Benefits**:
- ✅ Customer sees exact breakdown from creation time
- ✅ Consistent with what admin/user saw when subscribing
- ✅ No recalculation needed
- ✅ Faster page load (fewer API calls)
- ✅ Historical accuracy preserved

---

## Example Snapshot Data

### Subscription with Benefits Applied

```json
{
  "billingCycle": "weekly",
  "generatedAt": "2026-07-07T10:30:00.000Z",
  "rows": [
    {
      "schedule": "monday 08:00",
      "items": [
        { "name": "Kitheri moto Bhajia", "quantity": 2, "unitPrice": 40, "totalPrice": 80 }
      ],
      "baseFoodCost": 80,
      "baseDeliveryFee": 35.65,
      "benefitsApplied": ["50% Off Delivery"],
      "finalFoodCost": 80,
      "finalDeliveryFee": 17.82,
      "finalTotal": 97.82
    },
    {
      "schedule": "tuesday 19:00",
      "items": [
        { "name": "Crispy Chicken Shawarma", "quantity": 1, "unitPrice": 234, "totalPrice": 234 },
        { "name": "Spicy Ramen Noodle Bowl", "quantity": 1, "unitPrice": 324, "totalPrice": 324 }
      ],
      "baseFoodCost": 558,
      "baseDeliveryFee": 35.65,
      "benefitsApplied": ["50% Off Delivery"],
      "finalFoodCost": 558,
      "finalDeliveryFee": 17.82,
      "finalTotal": 575.82
    }
  ],
  "totals": {
    "rawFoodCost": 638,
    "rawDeliveryFee": 71.30,
    "rawTotal": 709.30,
    "foodSavings": 0,
    "deliverySavings": 35.64,
    "totalSavings": 35.64,
    "finalFoodCost": 638,
    "finalDeliveryFee": 35.64,
    "finalTotal": 673.64
  },
  "benefitsApplied": {
    "freeMealsUsed": 0,
    "maxFreeMeals": 4,
    "freeDeliveriesUsed": 2,
    "maxFreeDeliveries": "unlimited",
    "mealDiscountPercent": 0
  }
}
```

---

## Testing

### 1. Create New Subscription
```bash
# Create a new meal subscription
POST /api/subscriptions
{
  "planId": 1,
  "customSchedule": [...]
}

# Expected: Subscription created with costProjectionSnapshot populated
```

### 2. View Subscription as Customer
```bash
# Visit customer subscriptions page
GET /customer/subscriptions

# Expected: SavedCostProjectionTable displays exact snapshot
```

### 3. Legacy Subscription (No Snapshot)
```bash
# Subscriptions created before this feature
GET /customer/subscriptions

# Expected: Falls back to ScheduleProjectedCost with notice
```

---

## Files Modified

### Backend
1. `backend/modules/subscriptions/models/Subscription.js` - Added costProjectionSnapshot field
2. `backend/modules/subscriptions/services/SubscriptionEngine.js` - Generate snapshot on creation
3. `backend/modules/subscriptions/utils/costProjectionCalculator.js` - **NEW** - Calculation logic
4. `backend/migrations/20260707_add_cost_projection_snapshot.js` - **NEW** - Database migration

### Frontend
1. `frontend/src/modules/users/pages/CustomerSubscriptions.jsx` - Display saved snapshot
2. `frontend/src/shared/components/SavedCostProjectionTable.jsx` - **NEW** - Display component

---

## Migration Status

✅ **Migration completed successfully**

```bash
cd backend
npx sequelize-cli db:migrate
```

Output:
```
== 20260707_add_cost_projection_snapshot: migrating =======
📊 Adding costProjectionSnapshot column to Subscription table...
✅ Migration completed: costProjectionSnapshot column added successfully
== 20260707_add_cost_projection_snapshot: migrated (0.050s)
```

---

## Benefits of This Solution

1. **Historical Accuracy** - Customers see exactly what they agreed to at subscription time
2. **Price Freeze** - Even if food prices change, the snapshot reflects creation-time prices
3. **Benefit Freeze** - Benefit changes don't retroactively affect existing subscriptions
4. **Performance** - No need to re-fetch and recalculate data
5. **Transparency** - Clear timestamp shows when costs were calculated
6. **Backward Compatible** - Legacy subscriptions still work with fallback calculation
7. **Admin Consistency** - What admin sees = what customer sees

---

## Future Enhancements

### Potential Improvements
1. **Admin Preview** - Show the same snapshot in admin subscription view
2. **Snapshot Regeneration** - Allow admins to regenerate snapshot if schedule changes
3. **Snapshot History** - Store multiple snapshots if subscription is modified
4. **PDF Export** - Generate PDF invoices from snapshot data
5. **Comparison View** - Show side-by-side if recalculated values differ from snapshot

### API Endpoints to Consider
- `GET /api/subscriptions/:id/cost-projection` - Retrieve saved snapshot
- `POST /api/subscriptions/:id/regenerate-snapshot` - Admin-only regeneration
- `GET /api/subscriptions/:id/cost-comparison` - Compare snapshot vs current calculation

---

## Troubleshooting

### Snapshot Not Generated
**Symptom**: costProjectionSnapshot is null
**Causes**:
- Subscription is not a meal type
- No schedule data provided
- Error during snapshot generation (check logs)

**Solution**:
```bash
# Check subscription type
SELECT id, planId, costProjectionSnapshot FROM Subscription WHERE id = ?;

# Check console logs for snapshot generation errors
grep "Cost projection snapshot" backend/logs/app.log
```

### Legacy Subscriptions
**Symptom**: Old subscriptions show "calculated in real-time" notice
**This is expected** - Subscriptions created before this feature don't have snapshots.

**To generate snapshots for existing subscriptions**:
```javascript
// Create a script: backend/scripts/backfill-cost-snapshots.js
// Run it to generate snapshots for existing subscriptions
```

---

## Summary

✅ **Solution Implemented Successfully**

The customer subscription page now displays the **exact cost breakdown** as calculated at subscription creation time, stored in the database as a JSON snapshot. This ensures:
- Consistency between admin and customer views
- Historical accuracy
- No unexpected changes due to price or benefit modifications
- Better performance with fewer calculations

All new subscriptions automatically generate and save cost projection snapshots.
