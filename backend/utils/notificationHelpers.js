const { Notification, PlatformConfig, User } = require('../models');
const { sendMessage } = require('./messageService');
const { getDynamicMessage } = require('./templateUtils');


/**
 * Create a notification for a user
 * @param {number} userId - User ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, warning, alert)
 * @returns {Promise<object>} Created notification
 */
async function createNotification(userId, title, message, type = 'info') {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type,
            read: false
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * Notify delivery agent about new task assignment
 */
async function notifyDeliveryAgentAssignment(agentOrId, orderOrId, optionalOrderNumber, optionalDeliveryType) {
    const agentId = typeof agentOrId === 'object' ? agentOrId.id : agentOrId;
    const orderNumber = typeof orderOrId === 'object' ? orderOrId.orderNumber : (optionalOrderNumber || orderOrId);
    const deliveryType = optionalDeliveryType || (typeof orderOrId === 'object' ? orderOrId.deliveryType : null);

    const typeLabels = {
        'warehouse_to_customer': 'Warehouse → Customer',
        'customer_to_warehouse': 'Customer → Warehouse',
        'seller_to_customer': 'Seller → Customer',
        'seller_to_warehouse': 'Seller → Warehouse',
        'warehouse_to_pickup_station': 'Warehouse → Pickup Station',
        'seller_to_pickup_station': 'Seller → Pickup Station',
        'customer_to_pickup_station': 'Customer → Pickup Station',
        'pickup_station_to_warehouse': 'Pickup Station → Warehouse'
    };

    const message = await getDynamicMessage('agentTaskAssigned', 
        `You have been assigned a new delivery task for order #{orderNumber}. Type: {deliveryType}`,
        { orderNumber, deliveryType: typeLabels[deliveryType] || deliveryType }
    );

    return await createNotification(
        agentId,
        'New Delivery Task Assigned',
        message,
        'info'
    );

}

/**
 * Notify admin when agent rejects a task
 */
async function notifyAdminTaskRejection(orderId, orderNumber, agentName, reason) {
    // Find all admins
    const { User } = require('../models');
    const admins = await User.findAll({
        where: { role: ['admin', 'super_admin', 'superadmin'] }
    });

    const message = await getDynamicMessage('adminTaskRejected',
        `Delivery agent {agentName} rejected task for order #{orderNumber}. Reason: {reason}`,
        { agentName, orderNumber, reason }
    );

    for (const admin of admins) {
        await createNotification(
            admin.id,
            'Delivery Task Rejected',
            message,
            'warning'
        );
    }

}

/**
 * Notify customer about delivery status update
 */
async function notifyCustomerDeliveryUpdate(customerId, orderNumber, status, message) {
    const statusTitles = {
        'accepted': 'Delivery Accepted',
        'in_progress': 'Delivery In Progress',
        'completed': 'Delivery Completed',
        'failed': 'Delivery Failed'
    };

    return await createNotification(
        customerId,
        statusTitles[status] || 'Delivery Update',
        message || `Your order #${orderNumber} status has been updated to: ${status}`,
        status === 'completed' ? 'success' : status === 'failed' ? 'alert' : 'info'
    );
}

/**
 * Notify delivery agent when task is reassigned to them
 */
async function notifyDeliveryAgentReassignment(agentId, taskId, orderNumber) {
    const message = await getDynamicMessage('agentTaskReassigned',
        `A delivery task for order #{orderNumber} has been reassigned to you.`,
        { orderNumber }
    );

    return await createNotification(
        agentId,
        'Delivery Task Reassigned',
        message,
        'info'
    );

}

/**
 * Notify customer that driver is out for delivery with detailed info
 */
async function notifyCustomerOutForDelivery(order, agent) {
    const deliveryMethod = order.pickStation ? `Pick Up Station: ${order.pickStation}` : 'Door Delivery';
    const amountMsg = order.paymentConfirmed ? 'Order is fully paid.' : `Please prepare KES ${order.total} for payment.`;

    const message = await getDynamicMessage('orderInTransit',
        `Good news! Your order #{orderNumber} has been collected by {agentName} and is in transit. 🚚\n\nDelivery Method: {deliveryMethod}\n{amountMsg}\n\nYou can track your delivery in the app.`,
        { orderNumber: order.orderNumber, agentName: agent.name, deliveryMethod, amountMsg }
    );


    // Internal app notification
    await createNotification(
        order.userId,
        'Order In Transit 🚚',
        message,
        'info'
    );

    // WhatsApp Notification
    if (order.user?.phone || order.customerPhone) {
        const phone = order.user?.phone || order.customerPhone;
        await sendMessage(phone, message, 'whatsapp');
    }
}

/**
 * Notify customer that their order is ready for pickup at a station
 */
async function notifyCustomerReadyForPickupStation(order, station) {
    const message = await getDynamicMessage('orderReadyPickup',
        `Your order #{orderNumber} is ready for collection! 📦\n\nPickup Station: {stationName}\nLocation: {location}\nContact: {phone}`,
        { orderNumber: order.orderNumber, stationName: station.name, location: station.location, phone: station.phone || 'N/A' }
    );


    await createNotification(
        order.userId,
        'Order Ready for Collection 📦',
        message,
        'success'
    );

    // WhatsApp Notification
    if (order.user?.phone || order.customerPhone) {
        const phone = order.user?.phone || order.customerPhone;
        await sendMessage(phone, message, 'whatsapp');
    }
}

/**
 * Notify customer that their order has been placed
 */
async function notifyCustomerOrderPlaced(order, customer, itemsCount, itemNames) {
    console.log(`[DEBUG] notifyCustomerOrderPlaced for order #${order.orderNumber}. Customer phone: ${customer.phone}`);
    
    let deliveryInfoArr = [];
    if (order.deliveryMethod === 'pick_station') {
        deliveryInfoArr.push(`Method: Pickup Station`);
        deliveryInfoArr.push(`Location: ${order.pickStation || 'N/A'}`);
    } else {
        deliveryInfoArr.push(`Method: Home Delivery`);
        deliveryInfoArr.push(`Location: ${order.deliveryAddress || order.marketingDeliveryAddress || 'N/A'}`);
    }
    const deliveryInfo = deliveryInfoArr.join('\n');

    const message = await getDynamicMessage('orderPlaced',
        `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{items}\n\nTotal: KES {total}\nPayment: {paymentType}\n\nDelivery Information:\n{deliveryInfo}\n\nThank you for shopping with Comrades360!`,
        { 
            name: customer.name || 'Customer', 
            orderNumber: order.orderNumber, 
            items: itemNames || itemsCount,
            total: order.total?.toLocaleString(),
            paymentType: order.paymentType === 'cash_on_delivery' ? 'Cash on Delivery' : 'Paid',
            deliveryInfo
        }
    );


    // WhatsApp Notification
    if (customer.phone) {
        console.log(`[DEBUG] Calling sendMessage for WhatsApp to ${customer.phone}`);
        await sendMessage(customer.phone, message, 'whatsapp');
    } else {
        console.warn(`[DEBUG] No phone number for customer ${customer.id}, skipping WhatsApp`);
    }
}

/**
 * Notify customer that the agent has arrived at their location
 */
async function notifyCustomerAgentArrived(order, agent) {
    const message = await getDynamicMessage('agentArrived',
        `Your delivery agent {agentName} has arrived at your location! 📍\n\nPlease meet them to collect your order #{orderNumber}.\nAgent Phone: {phone}`,
        { agentName: agent.name, orderNumber: order.orderNumber, phone: agent.phone || 'N/A' }
    );


    await createNotification(
        order.userId,
        'Agent Arrived 📍',
        message,
        'success'
    );

    // WhatsApp Notification
    const phone = order.user?.phone || order.customerPhone;
    if (phone) {
        await sendMessage(phone, message, 'whatsapp');
    }
}

module.exports = {
    createNotification,
    notifyDeliveryAgentAssignment,
    notifyAdminTaskRejection,
    notifyCustomerDeliveryUpdate,
    notifyDeliveryAgentReassignment,
    notifyCustomerOutForDelivery,
    notifyCustomerReadyForPickupStation,
    notifyCustomerOrderPlaced,
    notifyCustomerAgentArrived
};
