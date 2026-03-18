const { sequelize, Order, OrderItem } = require('../models');

async function populate() {
  console.log('Starting population with quoted table names...');
  
  // 1. Add column using raw query to avoid reserved word issues
  try {
    console.log('Checking if totalBasePrice exists...');
    const [columns] = await sequelize.query('PRAGMA table_info("Order");');
    const columnExists = columns.some(c => c.name === 'totalBasePrice');
    
    if (!columnExists) {
      console.log('Adding totalBasePrice column to "Order" table...');
      await sequelize.query('ALTER TABLE "Order" ADD COLUMN "totalBasePrice" FLOAT DEFAULT 0;');
      console.log('Column added.');
    } else {
      console.log('totalBasePrice column already exists.');
    }
  } catch (err) {
    console.error('Column addition failed (it might already exist):', err.message);
  }

  // 2. Fetch all orders with their items
  console.log('Fetching orders...');
  // Sequelize should handle quoting if configured correctly, but we'll see
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
        
        let effectiveBasePrice = itemBasePrice;
        if (effectiveBasePrice <= 0) {
          effectiveBasePrice = Number(item.total || 0) / Math.max(1, quantity);
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
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  if (err.sql) console.error('SQL:', err.sql);
  if (err.stack) console.error('Stack:', err.stack);
  process.exit(1);
});
