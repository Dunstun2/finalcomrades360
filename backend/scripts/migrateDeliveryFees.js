/**
 * Migration Script: Distribute Order-Level Delivery Fees to Order Items
 * Using Sequelize Models for cross-db compatibility (SQLite/MySQL)
 */

const { sequelize, Order, OrderItem } = require('../models');
const { Op } = require('sequelize');

async function migrateDeliveryFees() {
  const t = await sequelize.transaction();

  try {
    console.log('🔄 Starting delivery fee migration (Schema + Data)...');

    // 0. Ensure Schema has necessary columns
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('OrderItem');

    if (!tableDesc.total) {
      console.log('🛠️ Adding missing column: total');
      await queryInterface.addColumn('OrderItem', 'total', {
        type: sequelize.Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: true
      }, { transaction: t });
    }

    if (!tableDesc.deliveryFee) {
      console.log('🛠️ Adding missing column: deliveryFee');
      await queryInterface.addColumn('OrderItem', 'deliveryFee', {
        type: sequelize.Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: true
      }, { transaction: t });
    }

    // 1. Get all orders that have a delivery fee > 0
    const orders = await Order.findAll({
      where: {
        deliveryFee: { [Op.gt]: 0 }
      },
      include: [{
        model: OrderItem,
        required: true
      }],
      transaction: t
    });

    console.log(`📦 Found ${orders.length} orders to process`);

    let updatedOrdersCount = 0;
    let updatedItemsCount = 0;

    for (const order of orders) {
      const orderDeliveryFee = Number(order.deliveryFee);
      const items = order.OrderItems;

      // Calculate total subtotal of all items
      const orderSubtotal = items.reduce((sum, item) => {
        // Use price * quantity since 'total' might be 0/null for old items
        const itemTotal = (item.price * item.quantity);
        return sum + itemTotal;
      }, 0);

      if (orderSubtotal <= 0) {
        // Warn but verify if we can proceed (unlikely for valid orders)
        if (orderDeliveryFee > 0) {
          console.warn(`⚠️ Order #${order.orderNumber} (ID: ${order.id}) has 0 subtotal but ${orderDeliveryFee} delivery fee.`);
        }
        continue;
      }

      // Distribute fee proportionally and update total if needed
      for (const item of items) {
        // Skip if this item already has a delivery fee
        if (Number(item.deliveryFee) > 0) continue;

        const itemTotal = (item.price * item.quantity);
        const share = itemTotal / orderSubtotal;
        const proportionalFee = share * orderDeliveryFee;

        // Update both deliveryFee and total (since we just added it)
        await item.update({
          deliveryFee: proportionalFee,
          total: itemTotal
        }, { transaction: t });

        updatedItemsCount++;
      }
      updatedOrdersCount++;
    }

    await t.commit();
    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Processed Orders: ${updatedOrdersCount}`);
    console.log(`   - Updated Items: ${updatedItemsCount}`);

    process.exit(0);

  } catch (error) {
    await t.rollback();
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDeliveryFees();
