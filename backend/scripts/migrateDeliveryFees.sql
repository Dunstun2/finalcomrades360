/**
 * SQL Migration: Distribute Order-Level Delivery Fees to Order Items
 * 
 * This SQL script updates existing OrderItem records to include proportional delivery fees.
 * Run this in your MySQL client or via a migration tool.
 */

-- Step 1: Add a temporary column to store item subtotals if needed
-- (This is just for calculation, we'll use it inline)

-- Step 2: Update each OrderItem with its proportional share of the order's deliveryFee
UPDATE OrderItem oi
INNER JOIN (
    -- Calculate the total subtotal for each order
    SELECT 
        orderId,
        SUM(COALESCE(total, price * quantity)) as orderSubtotal
    FROM OrderItem
    GROUP BY orderId
) AS orderTotals ON oi.orderId = orderTotals.orderId
INNER JOIN `Order` o ON oi.orderId = o.id
SET oi.deliveryFee = CASE 
    WHEN orderTotals.orderSubtotal > 0 THEN
        (COALESCE(oi.total, oi.price * oi.quantity) / orderTotals.orderSubtotal) * o.deliveryFee
    ELSE 
        0
    END
WHERE o.deliveryFee > 0 
  AND (oi.deliveryFee IS NULL OR oi.deliveryFee = 0);

-- Verify the update
SELECT 
    o.id as order_id,
    o.orderNumber,
    o.deliveryFee as order_delivery_fee,
    oi.id as item_id,
    oi.name as item_name,
    oi.total as item_subtotal,
    oi.deliveryFee as item_delivery_fee,
    (oi.total + oi.deliveryFee) as item_customer_total
FROM `Order` o
INNER JOIN OrderItem oi ON o.id = oi.orderId
WHERE o.deliveryFee > 0
ORDER BY o.id, oi.id;
