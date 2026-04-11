const { Order, DeliveryTask } = require('../models');
const { Op } = require('sequelize');

async function reconcile() {
  console.log('--- STARTING DATA RECONCILIATION ---');

  // 1. Fix Delivered but Unpaid COD orders
  console.log('Fixing payment confirmed status for delivered COD orders...');
  const [unpaidUpdated] = await Order.update(
    { paymentConfirmed: true },
    {
      where: {
        status: 'delivered',
        paymentType: 'cash_on_delivery',
        paymentConfirmed: false
      }
    }
  );
  console.log(`Updated ${unpaidUpdated} orders to paymentConfirmed: true.`);

  // 2. Fix stuck processing orders (including the ones the user or my audit identified)
  const targetOrderNumbers = ['ORD-1774346555004-240', 'ORD-1773941665993-320'];
  
  const stuckOrders = await Order.findAll({
    where: {
      [Op.or]: [
        { status: 'processing' },
        { orderNumber: { [Op.in]: targetOrderNumbers } }
      ]
    }
  });

  for (const order of stuckOrders) {
    console.log(`Resetting order ${order.orderNumber} (Current Status: ${order.status})...`);
    
    // If it was a return, maybe we should move it to 'returned' or 'order_placed'?
    // Actually, per user request to "not bypass anything", let's move it to a confirmable state.
    const resetStatus = order.status.startsWith('return') ? 'ready_for_pickup' : 'super_admin_confirmed';
    
    await order.update({ status: resetStatus, deliveryAgentId: null });
    
    // Also cancel any active delivery tasks for these orders
    const [tasksCancelled] = await DeliveryTask.update(
      { status: 'cancelled', agentNotes: 'Reset by system reconciliation due to inactivity/lock' },
      { 
        where: { 
          orderId: order.id, 
          status: { [Op.in]: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] } 
        } 
      }
    );
    console.log(`Cancelled ${tasksCancelled} active tasks for order ${order.orderNumber}.`);
  }

  console.log('--- RECONCILIATION COMPLETE ---');
  process.exit(0);
}

reconcile().catch(err => {
  console.error(err);
  process.exit(1);
});
