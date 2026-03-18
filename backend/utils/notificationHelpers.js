const { Notification } = require('../models');

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
    const deliveryType = typeof orderOrId === 'object' ? orderOrId.deliveryType : optionalDeliveryType;

    const typeLabels = {
        'warehouse_to_customer': 'Warehouse → Customer',
        'customer_to_warehouse': 'Customer → Warehouse',
        'seller_to_customer': 'Seller → Customer',
        'seller_to_warehouse': 'Seller → Warehouse'
    };

    return await createNotification(
        agentId,
        'New Delivery Task Assigned',
        `You have been assigned a new delivery task for order #${orderNumber}. Type: ${typeLabels[deliveryType] || deliveryType}`,
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

    for (const admin of admins) {
        await createNotification(
            admin.id,
            'Delivery Task Rejected',
            `Delivery agent ${agentName} rejected task for order #${orderNumber}. Reason: ${reason}`,
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
    return await createNotification(
        agentId,
        'Delivery Task Reassigned',
        `A delivery task for order #${orderNumber} has been reassigned to you.`,
        'info'
    );
}

/**
 * Notify customer that driver is out for delivery with detailed info
 */
async function notifyCustomerOutForDelivery(order, agent) {
    const deliveryMethod = order.pickStation ? `Pick Up Station: ${order.pickStation}` : 'Door Delivery';
    const amountMsg = order.paymentConfirmed ? 'Order is fully paid.' : `Please prepare KES ${order.total} for payment.`;

    const message = `Good news! Your order #${order.orderNumber} has been collected by ${agent.name} and is in transit.
    
Delivery Method: ${deliveryMethod}
${amountMsg}

You can track your delivery in the app.`;

    return await createNotification(
        order.userId,
        'Order In Transit 🚚',
        message,
        'info'
    );
}

/**
 * Notify customer that their order is ready for pickup at a station
 */
async function notifyCustomerReadyForPickupStation(order, station) {
    const message = `Your order #${order.orderNumber} is ready for collection!
    
Pickup Station: ${station.name}
Location: ${station.location}
Contact: ${station.phone || 'N/A'}
Opening Hours: ${station.openingHours || 'Standard Hours'}

Please bring your order number for identification.`;

    return await createNotification(
        order.userId,
        'Order Ready for Collection 📦',
        message,
        'success'
    );
}

module.exports = {
    createNotification,
    notifyDeliveryAgentAssignment,
    notifyAdminTaskRejection,
    notifyCustomerDeliveryUpdate,
    notifyDeliveryAgentReassignment,
    notifyCustomerOutForDelivery,
    notifyCustomerReadyForPickupStation
};
