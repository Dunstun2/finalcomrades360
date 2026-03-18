const { sequelize, Order, DeliveryAgentProfile } = require('../models');
const { Op } = require('sequelize');

async function check() {
  try {
    console.log('--- Checking Order #ORD-1773437798277-471 ---');
    const orderNumber = 'ORD-1773437798277-471';
    const order = await Order.findOne({
      where: { orderNumber },
      include: ['user', 'seller', 'deliveryAgent']
    });

    if (order) {
      console.log('Order found:');
      console.log({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgentId: order.deliveryAgentId,
        paymentConfirmed: order.paymentConfirmed,
        sellerId: order.sellerId,
        deliveryType: order.deliveryType,
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng
      });
      
      if (order.deliveryAgentId) {
          console.log('Order is already assigned to agent:', order.deliveryAgentId);
      } else {
          console.log('Order is UNASSIGNED.');
      }
    } else {
      console.log('Order NOT found in database.');
      // Try searching with # prefix just in case
      const orderWithHash = await Order.findOne({ where: { orderNumber: '#' + orderNumber } });
      if (orderWithHash) {
          console.log('Order found with # prefix!');
      } else {
          // Try searching partially
          const partialOrder = await Order.findOne({ where: { orderNumber: { [Op.like]: `%${orderNumber}%` } } });
          if (partialOrder) {
              console.log('Partial match found:', partialOrder.orderNumber);
          }
      }
    }

    console.log('\n--- Checking Database Schema ---');
    const orderDesc = await sequelize.getQueryInterface().describeTable('Order');
    console.log('Order table has deliveryLat:', !!orderDesc.deliveryLat);
    console.log('Order table has deliveryLng:', !!orderDesc.deliveryLng);

    const profileDesc = await sequelize.getQueryInterface().describeTable('DeliveryAgentProfile');
    console.log('DeliveryAgentProfile table has currentLocation:', !!profileDesc.currentLocation);

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await sequelize.close();
  }
}

check();
