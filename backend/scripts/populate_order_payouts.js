const { sequelize, Order, OrderItem } = require('../models');
const { DataTypes } = require('sequelize');

async function populate() {
  const queryInterface = sequelize.getQueryInterface();
  const tableInfo = await queryInterface.describeTable('Order');

  // 1. Add totalBasePrice column if it doesn't exist
  if (!tableInfo.totalBasePrice) {
    console.log('Adding totalBasePrice column to Order table...');
    await queryInterface.addColumn('Order', 'totalBasePrice', {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: true
    });
    console.log('Column added.');
  } else {
    console.log('totalBasePrice column already exists.');
  }

  // 2. Fetch all orders with their items
  console.log('Fetching orders...');
  const orders = await Order.findAll({
    include: [{ model: OrderItem, as: 'OrderItems' }]
  });

  console.log(`Processing ${orders.length} orders...`);

  let updatedCount = 0;
  for (const order of orders) {
    let orderTotalBasePrice = 0;
    
    if (order.OrderItems && order.OrderItems.length > 0) {
      for (const item of order.OrderItems) {
        const itemBasePrice = Number(item.basePrice || 0);
        const quantity = Number(item.quantity || 1);
        
        // Fallback logic for basePrice
        let effectiveBasePrice = itemBasePrice;
        if (effectiveBasePrice <= 0) {
          effectiveBasePrice = Number(item.total || 0) / Math.max(1, quantity);
          // Optionally update the item's basePrice in the DB as well
          await item.update({ basePrice: effectiveBasePrice });
        }
        
        orderTotalBasePrice += (effectiveBasePrice * quantity);
      }
    }

    await order.update({ totalBasePrice: orderTotalBasePrice });
    updatedCount++;
    if (updatedCount % 10 === 0) console.log(`Processed ${updatedCount} orders...`);
  }

  console.log(`SUCCESS: Populated payouts for ${updatedCount} orders.`);
  process.exit(0);
}

populate().catch(err => {
  console.error('Migration failed:');
  console.error(err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
