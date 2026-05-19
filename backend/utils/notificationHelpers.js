const fs = require('fs');
const path = require('path');
const { Notification, PlatformConfig, User } = require('../models');
const { sendMessage } = require('./messageService');
const { getDynamicMessage, getEnabledChannels } = require('./templateUtils');
const { sendEmail } = require('./mailer');
const { getIO } = require('../realtime/socket');
const siteUrl = process.env.FRONTEND_URL || 'https://comrades360.shop';
/**
 * File-based diagnostic logging
 */
function logNotify(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    try {
        // Use non-blocking async write to avoid event loop lag
        fs.promises.appendFile(path.join(__dirname, '../notification_debug.log'), logLine)
            .catch(err => console.warn('Deferred notification log write failed:', err.message));
        console.log(`🔔 ${message}`);
    } catch (e) {
        console.warn('Failed to initiate notification log write', e.message);
    }
}

/**
 * Universal helper to send a customer notification across all enabled channels
 */
async function sendCustomerNotificationAcrossChannels(templateKey, data, customerSource, order = null) {
    const orderNumber = order?.orderNumber || data.orderNumber || 'N/A';
    logNotify(`START: Event=${templateKey} | Order=${orderNumber}`);

    try {
        const [channels, messageRaw] = await Promise.all([
            getEnabledChannels(templateKey),
            getDynamicMessage(templateKey, data.defaultTemplate || '', data)
        ]);

        const logChannels = Object.entries(channels).filter(([_, v]) => v !== false).map(([k]) => k).join(', ');
        logNotify(`CONFIG: Enabled=${logChannels || 'NONE'}`);

        // 1. Resolve Customer Data (Self-Healing)
        let customer = customerSource || {};
        const userId = customer.id || order?.userId;
        
        if (!customer.phone || !customer.email) {
            if (userId) {
                logNotify(`SELF-HEAL: Fetching User ID ${userId}...`);
                const fullUser = await User.findByPk(userId);
                if (fullUser) {
                    customer = fullUser;
                    logNotify(`SELF-HEAL: Resolved User=${customer.name}`);
                }
            } else if (order) {
                logNotify(`SELF-HEAL: No User ID, using direct order details (Marketing/Guest)`);
            }
        }

        let message = messageRaw;

        // --- Tracking Link Guarantee ---
        // If a trackUrl was provided but the DB template didn't include {trackUrl},
        // always append it so customers always receive the link regardless of template customizations.
        if (data.trackUrl && !message.includes(data.trackUrl)) {
            message += `\n\n🔍 Track your order: ${data.trackUrl}`;
        }
        
        // Priority for phone/email: 
        // 1. Order direct (Guest/Marketing) -> This is critical as Marketing orders use req.body fields
        // 2. Resolved User (if available)
        const rawPhone = order?.customerPhone || order?.marketingPhone || customer.phone || order?.User?.phone;
        const rawEmail = order?.customerEmail || order?.marketingEmail || customer.email || order?.User?.email;

        // Strip placeholder values created when a user registers without phone/email
        const isPlaceholderPhone = !rawPhone || String(rawPhone).startsWith('nophone_');
        const isPlaceholderEmail = !rawEmail || String(rawEmail).startsWith('noemail_');
        const customerPhone = isPlaceholderPhone ? null : rawPhone;
        const customerEmail = isPlaceholderEmail ? null : rawEmail;

        logNotify(`RECIPIENT: ID=${userId || 'GUEST'} | Phone=${customerPhone || 'MISSING'} | Email=${customerEmail || 'MISSING'}`);

        if (!customerPhone && !customerEmail && !userId) {
            logNotify(`ABORT: No contact details or User ID found.`);
            return;
        }

        const runWithTimeout = (promise, channelName) => {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT (10s)')), 10000)
            );
            return Promise.race([promise, timeout])
                .then(() => logNotify(`SUCCESS: ${channelName}`))
                .catch(e => logNotify(`FAILED: ${channelName} -> ${e.message}`));
        };

        const promises = [];

        // 1. In-App Notification
        if (channels.in_app !== false && (customer.id || userId)) {
            logNotify(`DISPATCH: Attempting In-App...`);
            promises.push(runWithTimeout(
                createNotification(
                    customer.id || userId,
                    data.title || 'Order Update',
                    message,
                    data.type || 'info'
                ),
                'In-App'
            ));
        }

        // 2. WhatsApp
        if (channels.whatsapp !== false && customerPhone) {
            logNotify(`DISPATCH: Attempting WhatsApp to ${customerPhone}...`);
            promises.push(runWithTimeout(
                sendMessage(customerPhone, message, 'whatsapp'),
                'WhatsApp'
            ));
        }

        // 3. SMS
        if (channels.sms !== false && customerPhone) {
            logNotify(`DISPATCH: Attempting SMS to ${customerPhone}...`);
            promises.push(runWithTimeout(
                sendMessage(customerPhone, message, 'sms'),
                'SMS'
            ));
        }

        // 4. Email
        if (channels.email !== false && customerEmail) {
            logNotify(`DISPATCH: Attempting Email to ${customerEmail}...`);
            promises.push(runWithTimeout(
                sendEmail(customerEmail, data.title || 'Order Update', message),
                'Email'
            ));
        }

        await Promise.allSettled(promises);
        logNotify(`FINISHED: All channels processed for ${orderNumber}\n`);

    } catch (err) {
        logNotify(`FATAL ERROR: ${err.message}`);
        console.error(`🚨 [Notification System Crash]`, err);
    }
}

/**
 * Create a notification for a user
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

        // Emit real-time notification via Socket.IO
        try {
            const io = getIO();
            if (io) {
                console.log(`[Notification] Emitting real-time notification to user_${userId}`);
                io.to(`user_${userId}`).emit('notification:new', {
                    id: notification.id,
                    title,
                    message,
                    type,
                    createdAt: notification.createdAt,
                    read: false
                });
                
                // Also emit a general data-update event for background sync
                io.emit('realtime:data-updated', { scope: 'notifications', userId });
            }
        } catch (socketErr) {
            console.error('[Notification] Socket emission failed:', socketErr.message);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * Notify delivery agent about new task assignment
 */
/**
 * Notify delivery agent about new task assignment across all channels (In-app, WhatsApp, SMS, Email)
 */
async function notifyDeliveryAgentAssignment(agentOrId, orderOrId, optionalOrderNumber, optionalDeliveryType) {
    let agent = agentOrId;
    if (typeof agentOrId !== 'object') {
        agent = await User.findByPk(agentOrId);
    }
    
    if (!agent) {
        logNotify(`ABORT: No agent found for ID ${typeof agentOrId === 'object' ? agentOrId.id : agentOrId}`);
        return null;
    }

    const order = typeof orderOrId === 'object' ? orderOrId : null;
    const orderNumber = order ? order.orderNumber : (optionalOrderNumber || orderOrId);
    const deliveryType = optionalDeliveryType || (order ? order.deliveryType : null);

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

    // Extract extra details for the agent
    let itemsList = 'N/A';
    let totalAmount = '0';
    let pickupLocation = 'N/A';
    let deliveryLocation = 'N/A';
    let customerPhone = 'N/A';

    const { Order, OrderItem, Product, FastFood, Service, DeliveryTask, User, Warehouse, PickupStation } = require('../models');

    // Make sure we have the full order with items if not already loaded
    let fullOrder = order;
    if (order && order.id) {
        try {
            const found = await Order.findByPk(order.id, {
                include: [
                    {
                        model: OrderItem,
                        as: 'OrderItems',
                        include: [
                            { model: Product, as: 'Product', attributes: ['name'] },
                            { model: FastFood, as: 'FastFood', attributes: ['name'] },
                            { model: Service, as: 'Service', attributes: ['title'] }
                        ]
                    },
                    { model: User, as: 'seller', attributes: ['hostelName', 'roomNumber', 'address', 'campusName', 'phone', 'firstName', 'lastName', 'shopName'] },
                    { model: Warehouse, as: 'Warehouse', attributes: ['name', 'address', 'contactPhone'] },
                    { model: PickupStation, as: 'PickupStation', attributes: ['name', 'address', 'contactPhone'] },
                    { model: User, as: 'user', attributes: ['phone', 'firstName', 'lastName'] }
                ]
            });
            if (found) fullOrder = found;
        } catch(e) {
            console.error('Failed to fetch full order for notification', e);
        }
    }

    if (fullOrder) {
        if (fullOrder.OrderItems && fullOrder.OrderItems.length > 0) {
            itemsList = fullOrder.OrderItems.map(i => {
                const name = i.Product?.name || i.FastFood?.name || i.Service?.title || i.name || 'Item';
                return `${name} x${i.quantity || 1}`;
            }).join(', ');
        } else if (fullOrder.itemsCount) {
            itemsList = `${fullOrder.itemsCount} items`;
        }

        totalAmount = fullOrder.total?.toLocaleString() || '0';
        deliveryLocation = fullOrder.deliveryAddress || fullOrder.marketingDeliveryAddress || 'Selected Location';
        customerPhone = fullOrder.customerPhone || fullOrder.user?.phone || 'N/A';
    }

    // Try to get pickup location and updated delivery location from DeliveryTask
    try {
        const orderIdToSearch = fullOrder ? fullOrder.id : (typeof orderOrId !== 'object' ? orderOrId : null);
        if (orderIdToSearch) {
            const task = await DeliveryTask.findOne({
                where: {
                    orderId: orderIdToSearch,
                    deliveryAgentId: agent.id
                },
                order: [['createdAt', 'DESC']]
            });
            if (task) {
                if (task.pickupLocation) pickupLocation = task.pickupLocation;
                if (task.deliveryLocation) deliveryLocation = task.deliveryLocation;
            }
        }
    } catch(e) {
        console.error("Failed to fetch delivery task for agent notification", e);
    }

    // Fallback logic to derive pickup location if still missing
    if (pickupLocation === 'N/A' && fullOrder) {
        if (deliveryType === 'seller_to_customer' || deliveryType === 'seller_to_warehouse' || deliveryType === 'seller_to_pickup_station') {
            const seller = fullOrder.seller;
            if (seller) {
                pickupLocation = [seller.shopName, seller.hostelName, seller.roomNumber, seller.address].filter(Boolean).join(', ') || `${seller.firstName} ${seller.lastName}`;
                if (seller.phone) pickupLocation += ` (${seller.phone})`;
            } else {
                pickupLocation = 'Seller Location';
            }
        } else if (deliveryType === 'warehouse_to_customer' || deliveryType === 'warehouse_to_pickup_station' || deliveryType === 'warehouse_to_seller') {
            const warehouse = fullOrder.Warehouse;
            if (warehouse) {
                pickupLocation = `${warehouse.name} - ${warehouse.address || ''}`;
                if (warehouse.contactPhone) pickupLocation += ` (${warehouse.contactPhone})`;
            } else {
                pickupLocation = 'Warehouse';
            }
        } else if (deliveryType === 'pickup_station_to_customer' || deliveryType === 'pickup_station_to_warehouse') {
            const station = fullOrder.PickupStation;
            if (station) {
                pickupLocation = `${station.name} - ${station.address || ''}`;
                if (station.contactPhone) pickupLocation += ` (${station.contactPhone})`;
            } else {
                pickupLocation = 'Pickup Station';
            }
        } else if (deliveryType === 'customer_to_warehouse' || deliveryType === 'customer_to_pickup_station') {
            pickupLocation = fullOrder.deliveryAddress || fullOrder.marketingDeliveryAddress || 'Customer Address';
            if (fullOrder.customerPhone) pickupLocation += ` (${fullOrder.customerPhone})`;
        }
    }

    const isFastfood = fullOrder?.OrderItems?.some(i => i.fastFoodId != null) || false;
    const timeoutMsg = isFastfood ? "15 minutes" : "30 minutes";
    const dashboardUrl = `${process.env.FRONTEND_URL || 'https://comrades360.shop'}/dashboard/delivery`;

    const defaultTemplate = `You have been assigned a new delivery task for order #{orderNumber}. 🚚\n\nType: {deliveryType}\nItems: {itemsList}\nTotal to Pay: KES {totalAmount}\nPickup Point: {pickupLocation}\nDrop-off: {deliveryLocation}\nCustomer Phone: {customerPhone}\n\n⚠️ PLEASE ACCEPT WITHIN ${timeoutMsg} TO AVOID AUTOMATIC REASSIGNMENT.\n\nManage Task:\n{dashboardUrl}`;

    // We use sendCustomerNotificationAcrossChannels but pass the agent as the recipient
    // and explicitly set the template key to 'agentTaskAssigned'
    await sendCustomerNotificationAcrossChannels('agentTaskAssigned', {
        orderNumber,
        deliveryType: typeLabels[deliveryType] || deliveryType,
        itemsList,
        totalAmount,
        pickupLocation,
        deliveryLocation,
        customerPhone,
        dashboardUrl,
        title: 'New Delivery Task Assigned',
        type: 'info',
        defaultTemplate
    }, agent, null); // We pass order=null so it doesn't accidentally use customer phone/email

    return true;
}

/**
 * Notify admin when agent rejects a task
 */
async function notifyAdminTaskRejection(orderId, orderNumber, agentName, reason) {
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
 * Notify customer that the order has been placed (Structured receipt format)
 */
async function notifyCustomerOrderPlaced(order, customer, itemsCount, itemNames, referralCode = null) {
    const deliveryMethod = order.deliveryMethod === 'pick_station' ? 'Pickup Station' : 'Home Delivery';
    const name = customer?.name || order.customerName || 'Customer';
    const phone = customer?.phone || order.customerPhone;
    const customerInfo = `${name}${phone ? (', ' + phone) : ''}`;
    const deliveryLocation = order.deliveryMethod === 'pick_station' 
        ? (order.pickStation || 'N/A') 
        : (order.deliveryAddress || order.marketingDeliveryAddress || 'N/A');

    const deliveryFeeVal = Number(order.deliveryFee || 0);
    const deliveryFee = deliveryFeeVal > 0 ? deliveryFeeVal.toLocaleString() : '0';
    const paymentMethodLabel = `${order.paymentMethod || 'N/A'} - ${order.paymentType || 'N/A'}`;
    const subtotal = (Number(order.total || 0) - Number(order.deliveryFee || 0)).toLocaleString();
    const trackUrl = `${siteUrl}/track/${order.orderNumber}`;

    // For guest customers (no account) on direct/marketing orders, include a signup link
    // pre-filled with the marketer's referral code so they can register and claim this order.
    const isGuestCustomer = !order.userId && !customer?.id;
    const marketerRefCode = referralCode || order.marketerReferralCode;
    const signupUrl = isGuestCustomer && marketerRefCode
        ? `${siteUrl}/register?ref=${marketerRefCode}`
        : isGuestCustomer
        ? `${siteUrl}/register`
        : null;

    const defaultTemplate = signupUrl
        ? `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{itemsList}\nDelivery Fee: KES {deliveryFee}\n\nTotal: KES {total}\n\nPayment: {paymentMethod}\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryLocation}\n\n🔍 Track your order: {trackUrl}\n\n👤 Don't have an account yet? Create one to manage all your orders:\n{signupUrl}`
        : `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{itemsList}\nDelivery Fee: KES {deliveryFee}\n\nTotal: KES {total}\n\nPayment: {paymentMethod}\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryLocation}\n\nThank you for shopping with Comrades360! \n\nTrack your order here: {trackUrl}`;


    await sendCustomerNotificationAcrossChannels('orderPlaced', {
        name: name,
        orderNumber: order.orderNumber,
        itemsList: itemNames || `${itemsCount} items`,
        subtotal,
        deliveryFee,
        total: order.total?.toLocaleString() || '0',
        paymentMethod: paymentMethodLabel,
        deliveryMethod,
        deliveryLocation,
        trackUrl,
        signupUrl,
        phone: phone,
        email: customer?.email || order.customerEmail,
        title: 'Order Placed 🛍️',
        type: 'success',
        defaultTemplate
    }, customer, order);
}

/**
 * Notify customer that seller confirmed the order
 */
async function notifyCustomerSellerConfirmed(order, seller) {
    const sellerName = seller?.businessName || seller?.name || 'The Seller';
    const trackUrl = `${siteUrl}/track/${order.orderNumber}`;
    const defaultTemplate = `Hello {name}, good news! 🥗\n\nYour order #{orderNumber} has been confirmed by {sellerName} and is now being prepared.\n\nWe will notify you once it is handed over to our delivery agent.\n\n🔍 Track your order:\n{trackUrl}\n\nThank you for choosing Comrades360!`;

    await sendCustomerNotificationAcrossChannels('sellerConfirmed', {
        name: order.User?.name || order.customerName || 'Customer',
        orderNumber: order.orderNumber,
        sellerName,
        trackUrl,
        title: 'Order Confirmed! 🥗',
        type: 'success',
        defaultTemplate
    }, { id: order.userId }, order);
}

/**
 * Notify customer that driver is out for delivery
 */
async function notifyCustomerOutForDelivery(order, agent) {
    const trackUrl = `${siteUrl}/track/${order.orderNumber}`;
    const defaultTemplate = `Your order #{orderNumber} is on its way! 🚚\n\nHello {name}, your package has been collected by {agentName} ({agentPhone}) and is in transit.\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryAddress}\n\n🔍 Live tracking:\n{trackUrl}\n\nPlease stay reachable for a smooth delivery!`;

    await sendCustomerNotificationAcrossChannels('orderInTransit', {
        name: order.User?.name || order.customerName || 'Customer',
        orderNumber: order.orderNumber,
        agentName: agent.name,
        agentPhone: agent.phone || 'N/A',
        deliveryMethod: order.deliveryMethod === 'pick_station' ? 'Pickup Station' : 'Home Delivery',
        deliveryAddress: order.deliveryAddress || order.marketingDeliveryAddress || 'Selected Location',
        trackUrl,
        title: 'Order In Transit 🚚',
        type: 'info',
        defaultTemplate
    }, { id: order.userId }, order);
}

/**
 * Notify customer that order is ready at pick station
 */
async function notifyCustomerReadyForPickupStation(order, station) {
    const trackUrl = `${siteUrl}/track/${order.orderNumber}`;
    const defaultTemplate = `Your order #{orderNumber} is ready for collection! 📦\n\nHello {name}, your items have arrived at the pickup location and are ready for you.\n\nPickup Details:\nStation: {stationName}\nLocation: {stationLocation}\nContact: {stationPhone}\n\n🔍 View order status:\n{trackUrl}\n\nSee you soon at Comrades360!`;

    await sendCustomerNotificationAcrossChannels('orderReadyPickup', {
        name: order.User?.name || order.customerName || 'Customer',
        orderNumber: order.orderNumber,
        stationName: station.name,
        stationLocation: station.location || station.address || 'N/A',
        stationPhone: station.phone || 'N/A',
        trackUrl,
        type: 'success',
        defaultTemplate,
        phone: order.customerPhone,
        email: order.customerEmail
    }, { id: order.userId, name: order.customerName, phone: order.customerPhone, email: order.customerEmail }, order);
}

/**
 * Notify customer that the agent has arrived
 */
async function notifyCustomerAgentArrived(order, agent) {
    const defaultTemplate = `Your delivery agent {agentName} has arrived at your location! 📍\n\nPlease meet them to collect your order #{orderNumber}.\nAgent Phone: {phone}`;

    await sendCustomerNotificationAcrossChannels('agentArrived', {
        name: order.User?.name || order.customerName || 'Customer',
        agentName: agent.name,
        orderNumber: order.orderNumber,
        phone: agent.phone || 'N/A',
        type: 'success',
        defaultTemplate,
        phone: order.customerPhone,
        email: order.customerEmail
    }, { id: order.userId, name: order.customerName, phone: order.customerPhone, email: order.customerEmail }, order);
}

/**
 * Notify customer that the order has been cancelled
 */
async function notifyCustomerOrderCancelled(order, reason) {
    const defaultTemplate = `Order Notification: Cancellation ❌\n\nHello {name}, we regret to inform you that order #{orderNumber} has been cancelled.\n\nCancellation Details:\nReason: {reason}\n\nWe apologize for the inconvenience and hope to serve you again soon.`;

    await sendCustomerNotificationAcrossChannels('orderCancelled', {
        name: order.User?.name || order.customerName || 'Customer',
        orderNumber: order.orderNumber,
        reason: reason || 'N/A',
        title: 'Order Cancelled ❌',
        type: 'alert',
        defaultTemplate,
        phone: order.customerPhone,
        email: order.customerEmail
    }, { id: order.userId, name: order.customerName, phone: order.customerPhone, email: order.customerEmail }, order);
}



/**
 * Notify customer that an agent has accepted their delivery
 */
async function notifyCustomerAgentAccepted(order, agent) {
    const defaultTemplate = `Hello {name}, your order #{orderNumber} has been accepted by our delivery agent {agentName}. 🚚\n\nPlease expect a call via {agentPhone}. Thank you for choosing Comrades360!`;

    await sendCustomerNotificationAcrossChannels('agentAccepted', {
        name: order.User?.name || order.customerName || 'Customer',
        orderNumber: order.orderNumber,
        agentName: agent.name,
        agentPhone: agent.phone || 'N/A',
        title: 'Delivery Accepted 🚚',
        type: 'success',
        defaultTemplate
    }, { id: order.userId, name: order.customerName, phone: order.customerPhone, email: order.customerEmail }, order);
}

/**
 * Notify customer about delivery status update (Legacy generic fallback)
 */
/**
 * Notify customer about delivery status update across all channels
 */
async function notifyCustomerDeliveryUpdate(customerId, orderNumber, status, message, order = null) {
    const statusTitles = {
        'accepted': 'Delivery Accepted',
        'collected': 'Order Collected 📦',
        'in_progress': 'Delivery In Progress',
        'in_transit': 'Order In Transit 🚚',
        'completed': 'Delivery Completed ✅',
        'delivered': 'Order Delivered ✅',
        'failed': 'Delivery Failed ❌'
    };

    const title = statusTitles[status] || 'Delivery Update';
    const defaultTemplate = message || `Hello, your order #{orderNumber} status has been updated to: {status}.`;

    // Attempt to send across all channels
    await sendCustomerNotificationAcrossChannels('deliveryUpdate', {
        orderNumber,
        status: status.replace(/_/g, ' '),
        message: defaultTemplate,
        title,
        type: status === 'completed' || status === 'delivered' ? 'success' : status === 'failed' ? 'alert' : 'info',
        defaultTemplate
    }, { id: customerId }, order);
}

/**
 * Notify customer that their account has been created by a marketer
 */
async function notifyCustomerMarketerCreated(userOrId, tempPassword, loginIdentifier, marketerName = 'A Marketer') {
    // Accept either a full User object (fast path, no extra DB query) or a plain userId
    let user;
    if (userOrId && typeof userOrId === 'object' && userOrId.id) {
        user = userOrId;
    } else {
        user = await User.findByPk(userOrId);
    }
    const customerName = user?.name || 'Customer';
    const userId = user?.id || userOrId;

    const defaultTemplate = `HELLO {name}, Your Comrades360 Account has been successfully created by {marketerName}. \n\nYour temporary password is: {tempPassword}\n\nPlease login at {loginUrl} and change your password immediately to secure your account.\n\nWelcome to the Comrades360 family!`;
    
    const loginUrl = `${process.env.FRONTEND_URL || 'https://comrades360.shop'}/login`;

    await sendCustomerNotificationAcrossChannels('WELCOME_MARKETER_CREATED', {
        name: customerName,
        marketerName,
        loginIdentifier,
        tempPassword,
        loginUrl,
        title: 'Your Comrades360 Account! 🛍️',
        type: 'success',
        defaultTemplate
    }, user || { id: userId });
}

/**
 * Notify customer that their account was created via Google and provide temp password
 */
async function notifyCustomerGoogleSignup(user, tempPassword) {
    const defaultTemplate = `Welcome to Comrades360! 🌟\n\nHello {name}, you have successfully joined our community using Google.\n\nIf you ever want to log in without Google, your temporary password is:\n\n{tempPassword}\n\nWe recommend changing this in your account settings after your first login.\n\nThank you for choosing Comrades360!`;

    await sendCustomerNotificationAcrossChannels('googleWelcome', {
        name: user.name || 'Friend',
        tempPassword,
        title: 'Welcome to Comrades360! 🌟',
        type: 'success',
        defaultTemplate
    }, user);
}

/**
 * Notify marketer that they have successfully placed an order for a customer
 */
async function notifyMarketerOrderPlaced(order, marketer, customerName, commissionAmount) {
    if (!marketer || !order) return;

    const commission = commissionAmount || order.totalCommission || '0';
    const total = order.total?.toLocaleString() || '0';

    const defaultTemplate = `Success! 🚀 You have successfully placed order #{orderNumber} for {customerName}.\n\nTotal Amount: KES {total}\nYour Commission: KES {commission}\nItems: {itemsCount}\n\nKeep growing your network on Comrades360!`;

    await sendCustomerNotificationAcrossChannels('marketerOrderPlaced', {
        name: marketer.name || 'Marketer',
        orderNumber: order.orderNumber,
        customerName: customerName || order.customerName || 'your customer',
        total,
        commission: Number(commission).toLocaleString(),
        itemsCount: order.items || order.itemsCount || 'the selected items',
        title: 'Order Placed Successfully! 🚀',
        type: 'success',
        defaultTemplate
    }, marketer, null); // We pass null as order here because we want to notify the MARKETER directly using their details
}

/**
 * Notify seller about stock events (low stock or out of stock)
 */
async function notifySellerStockEvent(product, type) {
    if (!product) return;

    // Resolve seller
    let seller = product.seller;
    if (!seller && product.sellerId) {
        seller = await User.findByPk(product.sellerId);
    }
    
    if (!seller) {
        logNotify(`ABORT: No seller found for product ${product.id} stock event.`);
        return;
    }

    const isOutOfStock = type === 'out_of_stock';
    const templateKey = isOutOfStock ? 'productOutOfStock' : 'productLowStock';
    const title = isOutOfStock ? '🚫 Product Out of Stock' : '⚠️ Low Stock Warning';
    const defaultTemplate = isOutOfStock 
        ? `🚨 Alert! Your product "{name}" is now OUT OF STOCK.\n\nIt has been automatically hidden from public listings to prevent overselling.\n\nPlease restock as soon as possible to resume sales.`
        : `⚠️ Warning: Your product "{name}" is running low on stock.\n\nCurrent stock: {stock}\nThreshold: {threshold}\n\nConsider restocking soon to avoid service interruption.`;

    await sendCustomerNotificationAcrossChannels(templateKey, {
        name: product.name,
        stock: product.stock,
        threshold: product.lowStockThreshold || 5,
        title,
        type: isOutOfStock ? 'warning' : 'info',
        defaultTemplate
    }, seller);
    
    logNotify(`NOTIFIED: Seller ${seller.id} about ${type} for product ${product.id}`);
}

/**
 * Notify user about their National ID / Account verification status
 * Called by adminVerificationController after approve/reject
 */
async function notifyUserIdStatusUpdate(user, action, rejectionReason = null) {
    if (!user) return;

    const isApproved = action === 'approve';

    const title = isApproved
        ? '✅ Account Verified'
        : '❌ Verification Rejected';

    const defaultTemplate = isApproved
        ? `Hello {name},\n\nGreat news! Your identity has been verified and your Comrades360account is now fully activated.\n\nYou can now access all features including applying for seller, delivery, or service provider roles.\n\nWelcome to the verified community!\n\n— Comrades360 Team`
        : `Hello {name},\n\nWe regret to inform you that your identity verification was not successful.\n\nReason: {rejectionReason}\n\nPlease log in and re-upload a clear, valid National ID document to try again.\n\nIf you believe this is an error, contact our support team.\n\n— Comrades360 Team`;

    const templateKey = isApproved ? 'idVerificationApproved' : 'idVerificationRejected';

    await sendCustomerNotificationAcrossChannels(templateKey, {
        name: user.name || 'Customer',
        rejectionReason: rejectionReason || 'Document could not be verified.',
        title,
        type: isApproved ? 'success' : 'alert',
        defaultTemplate
    }, user);
}


/**
 * Send a thank you message to customer after delivery
 */
async function notifyCustomerOrderThankYou(order, type = 'all') {
    const name = order.User?.name || order.customerName || 'Customer';
    const orderNumber = order.orderNumber;
    
    let suffix = '';
    if (type === 'fastfood') suffix = ' Hope you enjoyed your meal! 🍔';
    if (type === 'product') suffix = ' We hope you love your new purchase! 🛍️';

    const defaultTemplate = `Hello {name}, thank you for shopping with Comrades360! 🌟\n\nYour order #{orderNumber} has been delivered.${suffix}\n\nWe value your support and look forward to serving you again soon!`;

    await sendCustomerNotificationAcrossChannels('orderThankYou', {
        name,
        orderNumber,
        suffix,
        title: 'Thank You for Your Order! 🌟',
        type: 'success',
        defaultTemplate,
        phone: order.customerPhone,
        email: order.customerEmail
    }, { id: order.userId, name, phone: order.customerPhone, email: order.customerEmail }, order);
}

/**
 * Notify seller that they have received a new order
 */
async function notifySellerOrderPlaced(order, seller, sellerAmount, itemsList) {
    if (!seller || !order) return;

    const amount = sellerAmount || '0';
    const orderNumber = order.orderNumber;

    const defaultTemplate = `🛍️ New Order Received!\n\nHello {name}, you have a new order #{orderNumber}.\n\nItems: {itemsList}\nTotal Earning: KES {amount}\n\nPlease log in to your dashboard to confirm and prepare the items: {dashboardUrl}\n\nThank you for selling with Comrades360!`;

    await sendCustomerNotificationAcrossChannels('sellerOrderPlaced', {
        name: seller.businessName || seller.name || 'Seller',
        orderNumber,
        itemsList,
        amount: Number(amount).toLocaleString(),
        dashboardUrl: `${siteUrl}/dashboard-login?redirect=/seller/orders`,
        title: 'New Order Received! 🛍️',
        type: 'success',
        defaultTemplate
    }, seller, null);
}

/**
 * Notify seller that an order has been edited
 */
async function notifySellerOrderEdited(order, seller, itemsList) {
    if (!seller || !order) return;

    const orderNumber = order.orderNumber;

    const defaultTemplate = `⚠️ Order Updated!\n\nHello {name}, order #{orderNumber} has been updated by an admin or marketer.\n\nPlease check the updated items or details in your dashboard.\n\nItems: {itemsList}\n\nDashboard: {dashboardUrl}`;

    await sendCustomerNotificationAcrossChannels('sellerOrderEdited', {
        name: seller.businessName || seller.name || 'Seller',
        orderNumber,
        itemsList,
        dashboardUrl: `${siteUrl}/dashboard-login?redirect=/seller/orders`,
        title: 'Order Updated ⚠️',
        type: 'warning',
        defaultTemplate
    }, seller, null);
}

module.exports = {
    createNotification,
    notifyDeliveryAgentAssignment,
    notifyAdminTaskRejection,
    notifyCustomerDeliveryUpdate,
    notifyCustomerOutForDelivery,
    notifyCustomerReadyForPickupStation,
    notifyCustomerOrderPlaced,
    notifyCustomerSellerConfirmed,
    notifyCustomerOrderCancelled,
    notifyCustomerMarketerCreated,
    notifyCustomerGoogleSignup,
    notifyMarketerOrderPlaced,
    notifySellerStockEvent,
    notifyUserIdStatusUpdate,
    notifyCustomerOrderThankYou,
    notifySellerOrderPlaced,
    notifyCustomerAgentAccepted,
    notifySellerOrderEdited,
    logNotify,
    sendCustomerNotificationAcrossChannels
};
