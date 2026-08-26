# Subscription Deletion Rules & Implementation

## Overview

Implemented safe deletion mechanism for both **Plan Templates** and **Benefit Packages** with proper validation rules and safeguards to prevent breaking active subscriptions or historical data.

---

## Plan Template Deletion Rules

### When Can Plans Be Deleted?

✅ **Can Delete:**
- Draft plans with no subscriptions
- Plans that have never been subscribed to

❌ **Cannot Delete:**
- Plans with **any subscriptions** (active, expired, or cancelled)
- Plans being used by customers

### Deletion Rules

#### Rule 1: No Active Subscriptions
```
If plan has active subscriptions (Trial, Active, Grace, Past Due):
  ❌ Deletion blocked
  Message: "This plan has X active subscription(s). Please cancel or migrate them first."
```

#### Rule 2: Preserve Historical Data
```
If plan has past subscriptions (Expired, Cancelled):
  ❌ Deletion blocked
  Message: "This plan has X past subscription(s). Deleting would break historical records."
  Suggestion: "Consider archiving the plan instead of deleting it."
```

#### Rule 3: Clean Deletion
```
If plan has no subscriptions:
  ✅ Safe to delete
  Actions:
    1. Delete all PlanBenefit records (cascade)
    2. Delete the Plan record
```

### What Happens on Deletion

1. **Pre-deletion Check**
   - Counts total subscriptions
   - Counts active subscriptions
   - Displays warning if any exist

2. **If Deletion Proceeds**
   - Deletes all plan benefits automatically (cascade)
   - Deletes the plan itself
   - Transaction ensures atomicity

3. **If Deletion Blocked**
   - Shows detailed breakdown
   - Suggests alternative actions (e.g., archiving)

---

## Benefit Package Deletion Rules

### When Can Packages Be Deleted?

✅ **Can Delete:**
- Packages not used by any published plan
- Packages only used by draft plans (will unlink them)

❌ **Cannot Delete:**
- Packages used by published plans
- Packages with active subscriptions through their plans

### Deletion Rules

#### Rule 1: Published Plans Check
```
If package is used by published plans:
  ❌ Deletion blocked
  Message: "This benefit package is used by X published plan(s)."
  Lists: Plan names using the package
  Suggestion: "Remove this package from all published plans before deleting."
```

#### Rule 2: Draft Plans Handling
```
If package is only used by draft plans:
  ✅ Allowed with warning
  Actions:
    1. Set benefitPackageId = NULL for all draft plans using it
    2. Delete all PackageBenefit records (cascade)
    3. Delete the BenefitPackage record
  Warning: "Unlinked from X draft plan(s)"
```

#### Rule 3: No Plans Using
```
If no plans are using the package:
  ✅ Safe to delete
  Actions:
    1. Delete all PackageBenefit records (cascade)
    2. Delete the BenefitPackage record
```

### What Happens on Deletion

1. **Pre-deletion Check**
   - Finds all plans using the package
   - Separates published vs draft plans
   - Shows which plans will be affected

2. **If Deletion Proceeds**
   - Unlinks from draft plans (if any)
   - Deletes all package benefits automatically (cascade)
   - Deletes the package itself
   - Transaction ensures atomicity

3. **If Deletion Blocked**
   - Lists all published plans using the package
   - Suggests removing package from those plans first

---

## API Endpoints

### Plan Deletion
```
DELETE /api/subscriptions/plans/:id
Authorization: Admin only

Responses:
  200: Plan deleted successfully
  400: Cannot delete (with detailed reason)
  404: Plan not found
  500: Server error
```

### Benefit Package Deletion
```
DELETE /api/subscriptions/benefit-packages/:id
Authorization: Admin only

Responses:
  200: Package deleted successfully
  400: Cannot delete (with detailed reason)
  404: Package not found
  500: Server error
```

### Check Before Deletion (Preview)
```
GET /api/subscriptions/plans/:id/check-deletion
GET /api/subscriptions/benefit-packages/:id/check-deletion
Authorization: Admin only

Returns:
  {
    canDelete: boolean,
    reason: string,
    subscriptionCount: number,     // For plans
    activeSubscriptionCount: number, // For plans
    plansUsing: number,            // For packages
    publishedPlansUsing: number,   // For packages
    publishedPlanNames: string[],  // For packages
    suggestion: string | null
  }
```

---

## UI/UX Flow

### 1. Delete Button Click
Admin clicks "Delete" button on a plan or package

### 2. Pre-deletion Check
System calls check endpoint to determine if deletion is safe

### 3. Confirmation Dialog
Shows detailed modal with:
- Item name
- Deletion status (can/cannot delete)
- Reason for status
- Detailed breakdown:
  - Plans: subscription counts (total, active)
  - Packages: plan usage counts (total, published, names)
- Suggestions for alternative actions
- Warning messages for edge cases

### 4. Deletion or Cancel
- **If cannot delete**: Only "Close" button shown
- **If can delete**: "Delete" and "Cancel" buttons shown
- Deletion proceeds with transaction

### 5. Result Notification
- Success: Toast with success message
- Error: Toast with error details and suggestions
- Warning: Additional toast for unlink actions

---

## Example Scenarios

### Scenario 1: Delete Draft Plan (No Subscriptions)
```
Status: ✅ Can Delete
Reason: "No subscriptions found - safe to delete"
Action: Plan deleted immediately
Result: Plan and all benefits removed from database
```

### Scenario 2: Delete Published Plan (5 Active Subscriptions)
```
Status: ❌ Cannot Delete
Reason: "Plan has 5 active subscription(s)"
Details:
  - Total Subscriptions: 5
  - Active Subscriptions: 5
Suggestion: "Consider archiving the plan instead of deleting it."
Action: Deletion blocked, suggestion shown
Result: Plan remains unchanged
```

### Scenario 3: Delete Plan (Only Expired Subscriptions)
```
Status: ❌ Cannot Delete
Reason: "Plan has 3 historical subscription(s)"
Details:
  - Total Subscriptions: 3
  - Active Subscriptions: 0
Suggestion: "Consider archiving the plan instead of deleting it."
Action: Deletion blocked to preserve history
Result: Plan remains unchanged
```

### Scenario 4: Delete Package (Used by Published Plans)
```
Status: ❌ Cannot Delete
Reason: "Package is used by 2 published plan(s)"
Details:
  - Plans Using Package: 3
  - Published Plans: 2
  - Published Plan Names: ["Premium Meal Plan", "Pro Seller Plan"]
Suggestion: "Remove this package from all published plans first"
Action: Deletion blocked, plan names shown
Result: Package remains unchanged
```

### Scenario 5: Delete Package (Only Used by Draft Plans)
```
Status: ✅ Can Delete (with warning)
Reason: "Package is only used by 2 draft plan(s) - will be unlinked"
Details:
  - Plans Using Package: 2
  - Published Plans: 0
Warning: "This will unlink the package from 2 draft plan(s)."
Action: Package deleted, draft plans unlinked
Result: Package deleted, draft plans have benefitPackageId = NULL
```

### Scenario 6: Delete Package (Not Used by Any Plan)
```
Status: ✅ Can Delete
Reason: "No plans using this package - safe to delete"
Action: Package deleted immediately
Result: Package and all benefits removed from database
```

---

## Safety Features

### 1. Transaction Safety
All deletions use database transactions:
```javascript
await sequelize.transaction(async (t) => {
  // Delete related records
  // Delete main record
});
```
If any step fails, entire operation rolls back.

### 2. Cascade Deletion
- Plan deletion → Automatically deletes PlanBenefit records
- Package deletion → Automatically deletes PackageBenefit records

### 3. Pre-deletion Validation
Every deletion attempt:
1. Checks for dependencies
2. Counts affected records
3. Returns detailed status
4. Blocks if unsafe

### 4. Clear User Feedback
- Detailed confirmation dialogs
- Color-coded status (red = error, yellow = warning, blue = info)
- Actionable suggestions
- Toast notifications with details

---

## Alternative to Deletion: Archiving

For plans with subscriptions, **archiving** is the recommended approach:

### Archive Instead of Delete
1. Set plan status to "Archived"
2. Plan no longer appears in customer selection
3. Existing subscriptions continue to work
4. Historical data preserved
5. Can be unarchived later if needed

### Implementation
```javascript
// Instead of deleting:
await Plan.update(
  { status: 'Archived', isVisible: false },
  { where: { id: planId } }
);
```

This preserves all data while removing the plan from active use.

---

## Testing Checklist

### Plan Deletion Tests
- [ ] Delete draft plan with no subscriptions → Success
- [ ] Delete published plan with active subscriptions → Blocked
- [ ] Delete plan with expired subscriptions → Blocked
- [ ] Try to delete non-existent plan → 404 error
- [ ] Check deletion preview before actual deletion → Correct info

### Package Deletion Tests
- [ ] Delete package not used by any plan → Success
- [ ] Delete package used by published plans → Blocked
- [ ] Delete package only used by draft plans → Success with warning
- [ ] Verify draft plans are unlinked → benefitPackageId = NULL
- [ ] Try to delete non-existent package → 404 error
- [ ] Check deletion preview before actual deletion → Correct info

### UI Tests
- [ ] Delete button appears for plans and packages
- [ ] Confirmation dialog shows correct information
- [ ] Cannot-delete dialog shows only "Close" button
- [ ] Can-delete dialog shows "Delete" and "Cancel" buttons
- [ ] Success toast appears after deletion
- [ ] Error toast shows detailed message
- [ ] Warning toast shows for unlink actions
- [ ] List refreshes after deletion

---

## Files Modified

### Backend
1. `backend/modules/subscriptions/controllers/deletionController.js` (NEW)
   - Plan deletion logic
   - Package deletion logic
   - Pre-deletion check endpoints

2. `backend/modules/subscriptions/routes/index.js`
   - Added DELETE endpoints
   - Added check-deletion endpoints

### Frontend
1. `frontend/src/shared/services/subscriptionService.js`
   - Added `deletePlan()`
   - Added `deleteBenefitPackage()`
   - Added `checkPlanDeletion()`
   - Added `checkPackageDeletion()`

2. `frontend/src/modules/admin/pages/AdminSubscriptions.jsx`
   - Added delete buttons
   - Added confirmation dialog
   - Added deletion state management
   - Added error handling

---

## Summary

✅ **Complete deletion mechanism implemented** with:
- Proper validation rules
- Safety checks for active subscriptions
- Historical data preservation
- Clear user feedback
- Transaction safety
- Cascade deletion
- Alternative suggestions (archiving)

The system prevents accidental data loss while allowing safe cleanup of unused plans and packages.
