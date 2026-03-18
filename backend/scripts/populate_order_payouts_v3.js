const { sequelize } = require('../models');

async function populate() {
  console.log('Starting population with RAW SQL for robustness...');
  
  try {
    // 1. Add column if it doesn't exist
    const [columns] = await sequelize.query('PRAGMA table_info("Order");');
    const columnExists = columns.some(c => c.name === 'totalBasePrice');
    
    if (!columnExists) {
      console.log('Adding totalBasePrice column to "Order" table...');
      await sequelize.query('ALTER TABLE "Order" ADD COLUMN "totalBasePrice" FLOAT DEFAULT 0;');
      console.log('Column added.');
    } else {
      console.log('totalBasePrice column already exists.');
    }

    // 2. Fetch all orders and their items using raw JOIN
    console.log('Fetching orders and items...');
    const [rows] = await sequelize.query(`
      SELECT 
        o.id as orderId,
        oi.id as itemId,
        oi.basePrice,
        oi.quantity,
        oi.total as itemTotal
      FROM "Order" o
      INNER JOIN OrderItem oi ON o.id = oi.orderId
    `);

    console.log(`Fetched ${rows.length} line items.`);

    // Group by orderId
    const orderGroups = {};
    rows.forEach(row => {
      if (!orderGroups[row.orderId]) orderGroups[row.orderId] = [];
      orderGroups[row.orderId].push(row);
    });

    const orderIds = Object.keys(orderGroups);
    console.log(`Processing ${orderIds.length} orders...`);

    let updatedCount = 0;
    for (const orderId of orderIds) {
      let orderTotalBasePrice = 0;
      const items = orderGroups[orderId];

      for (const item of items) {
        let basePrice = Number(item.basePrice || 0);
        const quantity = Number(item.quantity || 1);
        
        if (basePrice <= 0) {
          basePrice = Number(item.itemTotal || 0) / Math.max(1, quantity);
          // Update basePrice in OrderItem
          await sequelize.query(`UPDATE OrderItem SET basePrice = ${basePrice} WHERE id = ${item.itemId}`);
        }
        
        orderTotalBasePrice += (basePrice * quantity);
      }

      // Update Order
      await sequelize.query(`UPDATE "Order" SET totalBasePrice = ${orderTotalBasePrice} WHERE id = ${orderId}`);
      updatedCount++;
      if (updatedCount % 10 === 0) console.log(`Processed ${updatedCount} orders...`);
    }

    console.log(`SUCCESS: Populated payouts for ${updatedCount} orders.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:');
    console.error(err);
    process.exit(1);
  }
}

populate();
