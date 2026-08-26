# Cashback Benefit Implementation

## Overview
The cashback benefit allows subscribers to receive a percentage of their order total back as wallet credit after order delivery or completion. This feature rewards customers for their purchases and encourages repeat business.

## How It Works

### 1. Benefit Configuration
Cashback is configured as a benefit with feature code `cashback_orders` in the benefit package. The benefit value structure:

```json
{
  "cashbackPercent": 5,           // Or use "discountPercent" or "amount" (5%)
  "minOrderValue": 600,            // Minimum order total required (KES)
  "maxCashbackAmount": 100,        // Optional: Maximum cashback per order (KES)
  "limit": 1,                      // Number of times benefit can be used per period
  "conditions": {
    "minOrderValue": 600           // Alternative location for min order value
  }
}
```

**Example:** "The subscriber receives a 5% Cashback on Orders on orders over 600 KES, limited to 1 times per month"

### 2. Automatic Processing
Cashback is **automatically processed** when an order status changes to:
- `delivered`
- `completed`

The system checks:
1. ✅ Order is delivered/completed
2. ✅ User has an active subscription (Active, Trial, or Grace)
3. ✅ Subscription has cashback benefit
4. ✅ Usage limit not reached
5. ✅ Order total meets minimum requirement
6. ✅ Cashback not already processed for this order

### 3. Calculation Logic

```javascript
// Order subtotal (excluding delivery fee)
const orderSubtotal = order.total - order.deliveryFee;

// Check minimum order value
if (orderSubtotal < minOrderValue) {
  // No cashback applied
  return;
}

// Calculate cashback
let cashbackAmount = (orderSubtotal * cashbackPercent) / 100;

// Apply maximum limit if configured
if (maxCashbackAmount > 0 && cashbackAmount > maxCashbackAmount) {
  cashbackAmount = maxCashbackAmount;
}

// Credit to wallet
await BillingService.creditWallet(userId, cashbackAmount, description);

// Track usage
await UsageService.trackUsage(subscriptionId, 'cashback_orders', 1);
```

### 4. Example Scenarios

#### Scenario 1: Eligible Order
- Order Total: KES 1245
- Delivery Fee: KES 65
- Order Subtotal: KES 1180
- Benefit: 5% on orders over KES 600, limit 1/month
- **Result:** KES 59 cashback credited (5% of 1180)

#### Scenario 2: Below Minimum
- Order Total: KES 500
- Delivery Fee: KES 50
- Order Subtotal: KES 450
- Benefit: 5% on orders over KES 600
- **Result:** No cashback (below minimum)

#### Scenario 3: Usage Limit Reached
- Order Total: KES 800
- Previous cashback uses this month: 1
- Benefit limit: 1/month
- **Result:** No cashback (limit reached)

#### Scenario 4: Maximum Cashback Cap
- Order Total: KES 5000
- Cashback: 5% = KES 250
- Max Cashback: KES 100
- **Result:** KES 100 cashback (capped at maximum)

## Integration Points

### 1. Order Transition Controller
File: `backend/modules/orders/controllers/transition.controller.js`

```javascript
// Process cashback for delivered or completed orders
if (['delivered', 'completed'].includes(newStatus)) {
  const cashbackResult = await CashbackService.processCashbackForOrder(orderId);
  if (cashbackResult.applied) {
    // Log success
  }
}
```

### 2. Meal Subscription Orders
File: `backend/modules/subscriptions/services/MealSubscriptionService.js`

Meal subscription orders are created with `status: 'order_placed'`. Cashback is automatically processed when they transition to `delivered` or `completed` through the normal order lifecycle.

### 3. Database Fields
Added to `Order` model:
- `cashbackProcessed` (BOOLEAN) - Prevents duplicate processing
- `cashbackAmount` (FLOAT) - Records the amount credited

## API Endpoints

### Get Cashback Summary
```http
GET /api/subscriptions/my/cashback-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalCashback": 295.50,
  "totalOrders": 5,
  "orders": [
    {
      "orderId": 123,
      "orderNumber": "MEAL-1234567890-1234",
      "cashbackAmount": 59.00,
      "date": "2026-07-07T12:00:00.000Z"
    },
    ...
  ]
}
```

## Service Methods

### CashbackService.processCashbackForOrder(orderId)
Processes cashback for a single order.

**Returns:**
```javascript
{
  applied: true,
  cashbackAmount: 59.00,
  message: "Cashback of 59.00 KES credited successfully"
}
```

### CashbackService.processBulkCashback(orderIds)
Processes cashback for multiple orders (batch processing).

### CashbackService.getCashbackSummary(userId)
Gets cashback history for a user.

## Benefit Type Configuration

In the benefit package, the cashback benefit should have:
- **Feature Code:** `cashback_orders`
- **Feature Category:** Finance
- **Limit Type:** counter (tracks number of times used)
- **Value Structure:** As shown in section 1 above

## Database Migration

Migration file: `backend/migrations/20260706231702-add-cashback-fields-to-orders.js`

Adds:
- `Order.cashbackProcessed` (BOOLEAN, default: false)
- `Order.cashbackAmount` (FLOAT, default: 0)

Run migration:
```bash
cd backend
npx sequelize-cli db:migrate
```

## Testing

### Manual Test Flow
1. Create a subscription with cashback benefit (5% on orders over 600 KES, limit 1/month)
2. Create/generate a meal order with total > 600 KES
3. Transition order status to `delivered`
4. Check:
   - User wallet balance increased
   - `order.cashbackProcessed = true`
   - `order.cashbackAmount` set correctly
   - Usage tracked in SubscriptionUsage table
5. Try to process again → should skip (already processed)

### Expected Console Logs
```
[CashbackService] Applied 59.00 KES cashback to user 123 for order MEAL-1234567890-1234
[orderTransitionController] Cashback of 59.00 KES credited successfully
```

## Troubleshooting

### Cashback Not Applied
1. Check order status is `delivered` or `completed`
2. Verify user has active subscription
3. Check benefit package has `cashback_orders` feature
4. Verify min order value is met
5. Check usage limit not exceeded
6. Ensure `cashbackProcessed = false`

### Multiple Cashback Credits
- Should not happen due to `cashbackProcessed` flag
- If occurs, check for race conditions in order status updates

## Future Enhancements

1. **Cashback Notifications:** Send SMS/email when cashback is credited
2. **Tiered Cashback:** Different percentages based on order size
3. **Cashback Expiry:** Expire cashback credits after certain period
4. **Bonus Cashback:** Special promotions with higher percentages
5. **Category-Specific:** Different cashback rates for different product categories

## Related Files

- `backend/modules/subscriptions/services/CashbackService.js` - Main service
- `backend/modules/orders/controllers/transition.controller.js` - Order status integration
- `backend/modules/subscriptions/services/MealSubscriptionService.js` - Meal order integration
- `backend/modules/subscriptions/controllers/subscription.controller.js` - API endpoint
- `backend/modules/subscriptions/routes/index.js` - Route definition
- `backend/modules/orders/models/Order.js` - Database model
- `backend/migrations/20260706231702-add-cashback-fields-to-orders.js` - Migration

## Summary

Cashback is now fully integrated into the order lifecycle. When a customer with an active subscription completes an order meeting the minimum value requirement, they automatically receive a percentage back in their wallet, up to the configured usage limit. The system prevents duplicate processing and tracks all cashback credits for reporting purposes.
