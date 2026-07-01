const cron = require('node-cron');
const { Product, Notification, User, DeletedProduct, DeletedFastFood, Order, OrderItem, HandoverCode, DeliveryTask, Payment, DeliveryCharge, PlatformConfig, SupportMessage, sequelize } = require('../database/models.registry');
const { revertPending } = require('../utils/walletHelpers');
const { Op } = require('sequelize');
const autoDispatchService = require('../services/autoDispatchService');
const { initSubscriptionCrons } = require('../modules/subscriptions/cron');

const initScheduledTasks = () => {
    console.log('⏰ Initializing scheduled tasks...');

    // Register subscription module cron workers (renewals, meal generation, grace checks)
    initSubscriptionCrons();

    cron.schedule('0 9 * * *', async () => {
        console.log('🔔 Running daily low stock check...');
        try {
            // Find all products with stock <= lowStockThreshold AND stock > 0
            // We use COALESCE to default lowStockThreshold to 5 if null
            const products = await Product.findAll({
                where: {
                    stock: {
                        [Op.gt]: 0,
                        [Op.lte]: sequelize.fn('COALESCE', sequelize.col('lowStockThreshold'), 5)
                    },
                    isActive: true,
                    approved: true
                },
                include: [{
                    model: User,
                    as: 'seller',
                    attributes: ['id', 'name', 'email']
                }]
            });

            console.log(`📊 Found ${products.length} low stock products.`);

            // Group by seller to avoid spamming
            const sellerProductsMap = {};

            for (const product of products) {
                if (!product.sellerId) continue;

                if (!sellerProductsMap[product.sellerId]) {
                    sellerProductsMap[product.sellerId] = {
                        seller: product.seller,
                        items: []
                    };
                }
                sellerProductsMap[product.sellerId].items.push(product);
            }

            // Create notifications for each seller
            const notifications = [];
            const now = new Date();

            for (const sellerId in sellerProductsMap) {
                const { seller, items } = sellerProductsMap[sellerId];

                if (!seller) continue;

                // If only 1 item, specific message. If multiple, summary message.
                let title, message;

                if (items.length === 1) {
                    title = 'Low Stock Alert';
                    message = `Your product "${items[0].name}" is running low (${items[0].stock} remaining). Please restock soon.`;
                } else {
                    title = 'Low Stock Alert - Multiple Items';
                    message = `You have ${items.length} products running low on stock. Please check your inventory dashboard.`;
                }

                notifications.push({
                    userId: parseInt(sellerId),
                    type: 'stock_alert',
                    title: title,
                    message: message,
                    read: false,
                    createdAt: now,
                    updatedAt: now
                });
            }

            if (notifications.length > 0) {
                await Notification.bulkCreate(notifications);
                console.log(`✅ Created ${notifications.length} low stock notifications.`);
            }

        } catch (error) {
            console.error('❌ Error in daily low stock check:', error);
        }
    });

    // Run every day at 3:00 AM - Recycle Bin Cleanup
    // Permanently delete items that have reached their autoDeleteAt timestamp
    cron.schedule('0 3 * * *', async () => {
        console.log('🧹 Running daily recycle bin cleanup...');
        try {
            const now = new Date();
            // 1. Products
            const expiredProducts = await DeletedProduct.findAll({
                where: {
                    autoDeleteAt: {
                        [Op.lte]: now
                    }
                }
            });

            let deletedProductsCount = 0;
            for (const dp of expiredProducts) {
                // Permanently delete the original soft-deleted product
                const originalProduct = await Product.findOne({ where: { id: dp.originalId } });
                if (originalProduct) {
                    try {
                        const db = require('../database/models.registry');
                        if (db.CartItem) await db.CartItem.destroy({ where: { productId: originalProduct.id } });
                        if (db.Wishlist) await db.Wishlist.destroy({ where: { productId: originalProduct.id } });
                        if (db.ProductVariant) await db.ProductVariant.destroy({ where: { productId: originalProduct.id } });
                        if (db.ProductView) await db.ProductView.destroy({ where: { productId: originalProduct.id } });
                        if (db.ProductInquiry) await db.ProductInquiry.destroy({ where: { productId: originalProduct.id } });
                        if (db.ProductReview) await db.ProductReview.destroy({ where: { productId: originalProduct.id } });
                        if (db.Commission) await db.Commission.destroy({ where: { productId: originalProduct.id } });
                        if (db.StockAuditLog) await db.StockAuditLog.destroy({ where: { productId: originalProduct.id } });
                        if (db.StockReservation) await db.StockReservation.destroy({ where: { productId: originalProduct.id } });
                        if (db.WarehouseStock) await db.WarehouseStock.destroy({ where: { productId: originalProduct.id } });
                        if (db.ProductDeletionRequest) await db.ProductDeletionRequest.destroy({ where: { productId: originalProduct.id } });
                        if (db.OrderItem) await db.OrderItem.update({ productId: null }, { where: { productId: originalProduct.id } });
                    } catch (e) {
                        console.warn('Error cleaning up related records during cron deletion of product', originalProduct.id, e);
                    }
                    await originalProduct.destroy();
                }
                
                // Cleanup files
                const filesToDelete = [];
                try {
                    if (dp.images) {
                        const images = typeof dp.images === 'string' ? JSON.parse(dp.images) : dp.images;
                        if (Array.isArray(images)) filesToDelete.push(...images);
                    }
                    if (dp.logistics) {
                        const logistics = typeof dp.logistics === 'string' ? JSON.parse(dp.logistics) : dp.logistics;
                        if (logistics.videoPath) filesToDelete.push(logistics.videoPath);
                    }
                } catch (e) {}
                
                if (filesToDelete.length > 0) {
                    const { deleteFiles } = require('../utils/fileHelpers');
                    if (deleteFiles) deleteFiles(filesToDelete);
                }

                await dp.destroy();
                deletedProductsCount++;
            }

            // 2. Fast Food
            const deletedFastFoodsCount = await DeletedFastFood.destroy({
                where: {
                    autoDeleteAt: {
                        [Op.lte]: now
                    }
                }
            });

            if (deletedProductsCount > 0 || deletedFastFoodsCount > 0) {
                console.log(`✅ Permanently deleted ${deletedProductsCount} products and ${deletedFastFoodsCount} fast food items from recycle bin.`);
            }
        } catch (error) {
            console.error('❌ Error in recycle bin cleanup:', error);
        }
    });

    // Run every day at 4:00 AM - Auto-complete delivered orders after 7 days
    cron.schedule('0 4 * * *', async () => {
        console.log('📦 Running daily order auto-completion check...');
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Find orders delivered more than 7 days ago that are still in 'delivered' status
            const [updatedCount] = await Order.update(
                { status: 'completed' },
                {
                    where: {
                        status: 'delivered',
                        actualDelivery: {
                            [Op.lte]: sevenDaysAgo
                        }
                    }
                }
            );

            if (updatedCount > 0) {
                console.log(`✅ Auto-completed ${updatedCount} orders past the 7-day return window.`);
            }
        } catch (error) {
            console.error('❌ Error in order auto-completion check:', error);
        }
    });

    // Run every day at midnight - Auto-complete delivered Fast Food orders
    cron.schedule('0 0 * * *', async () => {
        console.log('🍔 Running midnight Fast Food order auto-completion check...');
        try {
            const deliveredOrders = await Order.findAll({
                where: { status: 'delivered' },
                include: [{
                    model: OrderItem,
                    as: 'OrderItems',
                    attributes: ['id', 'fastFoodId']
                }]
            });

            let completedCount = 0;
            for (const order of deliveredOrders) {
                const isFastFood = (order.OrderItems || []).some(item => item.fastFoodId != null);
                if (isFastFood) {
                    await order.update({ status: 'completed' });
                    completedCount++;
                }
            }

            if (completedCount > 0) {
                console.log(`✅ Auto-completed ${completedCount} delivered Fast Food orders.`);
            }
        } catch (error) {
            console.error('❌ Error in Fast Food order auto-completion check:', error);
        }
    });

    // Run every day at 2:00 AM - Database Backup
    cron.schedule('0 2 * * *', async () => {
        console.log('💾 Running daily database backup...');
        try {
            const { backupSQLite, backupMySQL, backupUploads, rotateBackups } = require('../scripts/backup-database');
            const { sequelize } = require('../database/database');

            const dialect = sequelize.options.dialect;
            if (dialect === 'sqlite') {
                await backupSQLite();
            } else if (dialect === 'mysql') {
                await backupMySQL();
            }

            await backupUploads();
            await rotateBackups();

            console.log('✅ Daily backup completed successfully');
        } catch (error) {
            console.error('❌ Error in daily backup:', error);
        }
    });

    // Run every day at 5:00 AM - Support Message History Cleanup (1 Month Retention)
    cron.schedule('0 5 * * *', async () => {
        console.log('💬 Running daily support message cleanup...');
        try {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            const deletedCount = await SupportMessage.destroy({
                where: {
                    createdAt: {
                        [Op.lte]: oneMonthAgo
                    }
                }
            });

            if (deletedCount > 0) {
                console.log(`✅ Cleaned up ${deletedCount} support messages older than 1 month.`);
            }
        } catch (error) {
            console.error('❌ Error in support message cleanup:', error);
        }
    });

    // Run every 15 minutes - Cleanup Expired Stock Reservations
    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('🔄 Running stock reservation cleanup...');
            const { cleanupExpiredReservations } = require('../modules/platform/controllers/inventory.controller');
            await cleanupExpiredReservations();
        } catch (error) {
            console.error('❌ Error in stock reservation cleanup:', error);
        }
    });

    // 2. Retry failed payments (Runs every 15 minutes)
    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('🔄 Processing payment retry queue...');
            const { processRetryQueue } = require('../modules/finance/controllers/paymentEnhancements.controller');
            await processRetryQueue();
        } catch (error) {
            console.error('❌ Error in payment retry processing:', error);
        }
    });

    // 3. Check low stock and notify sellers (Runs once daily at 9:00 AM)
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('🔄 Running daily low stock check...');
            const { checkLowStockAndNotify } = require('../modules/platform/controllers/inventory.controller');
            await checkLowStockAndNotify();
        } catch (error) {
            console.error('❌ Error in enhanced low stock check:', error);
        }
    });

    // ─── CRON: Auto-expire unaccepted delivery task assignments + Auto-Reassignment broadcast ───
    // Runs every minute — covers tasks stuck in 'assigned' status (never accepted)
    cron.schedule('* * * * *', async () => {
        try {
            const { Order, DeliveryTask, PlatformConfig, DeliveryAgentProfile, Notification, OrderItem } = require('../database/models.registry');
            const { getIO } = require('../realtime/socket');

            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            let fastfoodExpiryMinutes = 15;
            let productExpiryMinutes = 30;
            let settings = {};
            if (config) {
                try {
                    settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    if (settings.fastfoodTaskExpiryMinutes) fastfoodExpiryMinutes = parseInt(settings.fastfoodTaskExpiryMinutes, 10);
                    if (settings.productTaskExpiryMinutes) productExpiryMinutes = parseInt(settings.productTaskExpiryMinutes, 10);
                } catch (e) {
                    console.error('[DeliveryExpiry] Failed to parse logistic_settings:', e.message);
                }
            }

            const minExpiryMinutes = Math.min(fastfoodExpiryMinutes, productExpiryMinutes);
            const earliestThreshold = new Date(Date.now() - minExpiryMinutes * 60 * 1000);
            const expiredTasks = await DeliveryTask.findAll({
                where: { status: 'assigned', assignedAt: { [Op.lte]: earliestThreshold } },
                include: [{ model: Order, as: 'order', include: [{ model: OrderItem, as: 'OrderItems', attributes: ['id', 'fastFoodId', 'productId'] }] }]
            });

            if (expiredTasks.length === 0) return;

            const now = Date.now();
            const trulyExpired = expiredTasks.filter(task => {
                if (!task.order || !task.assignedAt) return false;
                const isFastfood = (task.order.OrderItems || []).some(i => i.fastFoodId != null);
                const thresholdMs = (isFastfood ? fastfoodExpiryMinutes : productExpiryMinutes) * 60 * 1000;
                return (now - new Date(task.assignedAt).getTime()) >= thresholdMs;
            });

            if (trulyExpired.length === 0) return;
            console.log(`⏰ [DeliveryExpiry] Expiring ${trulyExpired.length} unaccepted tasks...`);

            const onlineAgents = await DeliveryAgentProfile.findAll({ where: { isActive: true }, attributes: ['id', 'userId'] });
            const onlineAgentUserIds = onlineAgents.map(a => a.userId);
            const io = getIO();

            for (const task of trulyExpired) {
                await task.update({ status: 'failed' });
                if (task.order) {
                    const revertStatus = task.order.sellerConfirmed ? 'seller_confirmed' : 'order_placed';
                    await task.order.update({ deliveryAgentId: null, status: revertStatus });
                    console.log(`↩️  Order #${task.order.orderNumber} reverted to '${revertStatus}' — agent did not accept in time.`);

                    if (settings.autoDispatchOrders) {
                        autoDispatchService.runAutoDispatch(task.order.id, { excludeAgentIds: [task.deliveryAgentId] }).catch(err => console.error('[AutoDispatch] Failed:', err));
                    }

                    if (io && onlineAgentUserIds.length > 0) {
                        const broadcastPayload = {
                            orderId: task.order.id,
                            orderNumber: task.order.orderNumber,
                            deliveryAddress: task.order.deliveryAddress,
                            deliveryType: task.deliveryType,
                            message: `📦 Order #${task.order.orderNumber} needs a delivery agent. Be the first to accept!`
                        };
                        for (const agentUserId of onlineAgentUserIds) {
                            io.to(`user_${agentUserId}`).emit('new_task_available', broadcastPayload);
                        }
                        io.to('admin_room').emit('task_auto_expired', {
                            orderId: task.order.id,
                            orderNumber: task.order.orderNumber,
                            message: `Task for order #${task.order.orderNumber} expired. Broadcasted to ${onlineAgentUserIds.length} agents.`
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in delivery task expiry cleanup:', error);
        }
    });

    // ─── CRON: Accepted → Collection Enforcer ───
    // Runs every 2 minutes — covers tasks stuck in 'accepted' status (accepted but agent hasn't collected)
    cron.schedule('*/2 * * * *', async () => {
        try {
            const { Order, DeliveryTask, PlatformConfig, DeliveryAgentProfile, Notification, OrderItem, User } = require('../database/models.registry');
            const { getIO } = require('../realtime/socket');
            const { revertPending } = require('../utils/walletHelpers');

            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            let settings = {};
            if (config) {
                try { settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value; } catch (e) {}
            }

            // Config values with defaults
            const ffWarnRatio  = parseFloat(settings.fastfoodCollectionWarnRatio  || 0.6);
            const ffFailRatio  = parseFloat(settings.fastfoodCollectionFailRatio  || 0.8);
            const ffFallbackWarnMin = parseInt(settings.fastfoodCollectionFallbackWarnMinutes || 8,  10);
            const ffFallbackFailMin = parseInt(settings.fastfoodCollectionFallbackFailMinutes || 12, 10);
            const prodWarnMin  = parseInt(settings.productCollectionWarnMinutes || 30, 10);
            const prodAlertHrs = parseFloat(settings.productCollectionAlertHours  || 2);

            // Find all accepted tasks not yet collected
            const acceptedTasks = await DeliveryTask.findAll({
                where: {
                    status: 'accepted',
                    acceptedAt: { [Op.ne]: null },
                    collectedAt: null
                },
                include: [
                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id', 'orderNumber', 'deliveryAddress', 'estimatedDelivery', 'createdAt', 'sellerConfirmed', 'userId', 'deliveryFee'],
                        include: [{ model: OrderItem, as: 'OrderItems', attributes: ['id', 'fastFoodId'] }]
                    },
                    { model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }
                ]
            });

            if (acceptedTasks.length === 0) return;

            const now = Date.now();
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'super_admin', 'superadmin'] } },
                attributes: ['id']
            });
            const io = getIO();
            const onlineAgents = await DeliveryAgentProfile.findAll({ where: { isActive: true }, attributes: ['userId'] });
            const onlineAgentUserIds = onlineAgents.map(a => a.userId);

            for (const task of acceptedTasks) {
                if (!task.order || !task.acceptedAt) continue;
                const isFastfood = (task.order.OrderItems || []).some(i => i.fastFoodId != null);
                const acceptedMs = new Date(task.acceptedAt).getTime();
                const elapsedMs = now - acceptedMs;

                if (isFastfood) {
                    // ── FastFood: dynamic deadline from estimatedDelivery ──
                    let warnMs, failMs;
                    const estimatedDelivery = task.order.estimatedDelivery ? new Date(task.order.estimatedDelivery).getTime() : null;
                    const orderCreated      = task.order.createdAt        ? new Date(task.order.createdAt).getTime()        : null;

                    if (estimatedDelivery && orderCreated && estimatedDelivery > orderCreated) {
                        const totalWindowMs = estimatedDelivery - orderCreated;
                        warnMs = totalWindowMs * ffWarnRatio;
                        failMs = totalWindowMs * ffFailRatio;
                    } else {
                        // Fallback: measure from acceptedAt
                        warnMs = ffFallbackWarnMin * 60 * 1000;
                        failMs = ffFallbackFailMin * 60 * 1000;
                    }

                    const timeFromOrderCreation = orderCreated ? (now - orderCreated) : elapsedMs;

                    // ── FAIL: past fail threshold ──
                    if (timeFromOrderCreation >= failMs) {
                        console.log(`🚨 [CollectionEnforcer] FastFood task ${task.id} FAILED — agent did not collect in time.`);
                        await task.update({ status: 'failed', failureReason: 'Agent did not collect within the expected delivery window.' });

                        // Revert order
                        const revertStatus = task.order.sellerConfirmed ? 'seller_confirmed' : 'order_placed';
                        await task.order.update({ deliveryAgentId: null, status: revertStatus });

                        // Revert pending wallet credit for this agent
                        try {
                            const { DeliveryCharge } = require('../database/models.registry');
                            const charges = await DeliveryCharge.findAll({ where: { orderId: task.order.id, payeeUserId: task.deliveryAgentId } });
                            for (const charge of charges) {
                                if (charge.agentAmount > 0) await revertPending(charge.payeeUserId, charge.agentAmount, task.order.id);
                                await charge.update({ fundingStatus: 'reversed', note: 'Collection timeout — agent did not collect FastFood order in time' });
                            }
                        } catch (e) { console.error('[CollectionEnforcer] Wallet revert error:', e.message); }

                        // Notify agent
                        if (task.deliveryAgentId) {
                            await Notification.create({
                                userId: task.deliveryAgentId,
                                title: '❌ Assignment Cancelled',
                                message: `Order #${task.order.orderNumber} was reassigned because you did not collect it within the delivery window.`,
                                type: 'warning'
                            });
                            if (io) io.to(`user:${task.deliveryAgentId}`).emit('deliveryTaskRemoved', {
                                orderId: task.order.id, taskId: task.id, reason: 'Collection timeout — order reassigned.'
                            });
                        }

                        // Notify admins
                        for (const admin of admins) {
                            await Notification.create({ userId: admin.id, title: '🚨 FastFood Collection Timeout', message: `Order #${task.order.orderNumber}: Agent ${task.deliveryAgent?.name || task.deliveryAgentId} did not collect in time. Order re-queued.`, type: 'warning' });
                        }

                        // Re-broadcast to online agents
                        if (io && onlineAgentUserIds.length > 0) {
                            const payload = { orderId: task.order.id, orderNumber: task.order.orderNumber, deliveryAddress: task.order.deliveryAddress, deliveryType: task.deliveryType, message: `📦 Order #${task.order.orderNumber} needs a delivery agent. Be the first to accept!` };
                            for (const uid of onlineAgentUserIds) io.to(`user_${uid}`).emit('new_task_available', payload);
                        }

                        // Auto-dispatch if enabled
                        if (settings.autoDispatchOrders) {
                            autoDispatchService.runAutoDispatch(task.order.id, { excludeAgentIds: [task.deliveryAgentId] }).catch(() => {});
                        }

                    // ── WARN: past warn threshold but not yet failed, and not yet warned ──
                    } else if (timeFromOrderCreation >= warnMs && !task.warningSentAt) {
                        const minsLeft = Math.max(0, Math.round((failMs - timeFromOrderCreation) / 60000));
                        console.log(`⚠️  [CollectionEnforcer] FastFood task ${task.id} WARNING — ${minsLeft} min left to collect.`);

                        await task.update({ warningSentAt: new Date() });

                        // Warn agent
                        if (task.deliveryAgentId) {
                            await Notification.create({
                                userId: task.deliveryAgentId,
                                title: '⚠️ Urgent: Collect Order Now!',
                                message: `You have approximately ${minsLeft} minute(s) to collect Order #${task.order.orderNumber} or it will be reassigned to another agent.`,
                                type: 'warning'
                            });
                            if (io) io.to(`user:${task.deliveryAgentId}`).emit('delivery_warning', {
                                taskId: task.id, orderId: task.order.id, orderNumber: task.order.orderNumber,
                                message: `⚠️ Collect Order #${task.order.orderNumber} within ${minsLeft} minute(s) or it will be reassigned!`,
                                minutesLeft: minsLeft
                            });
                        }
                    }

                } else {
                    // ── Product Order: alert-only, no auto-fail ──
                    const prodWarnMs  = prodWarnMin  * 60 * 1000;
                    const prodAlertMs = prodAlertHrs * 60 * 60 * 1000;

                    if (elapsedMs >= prodAlertMs) {
                        // Alert admin (deduplicate per task — check warningSentAt was already used for the first warn)
                        const alreadyAlerted = task.warningSentAt && (now - new Date(task.warningSentAt).getTime()) < prodAlertMs;
                        if (!alreadyAlerted) {
                            console.log(`🔔 [CollectionEnforcer] Product task ${task.id} ADMIN ALERT — agent not collecting after ${prodAlertHrs}h.`);
                            for (const admin of admins) {
                                const recent = await Notification.findOne({ where: { userId: admin.id, type: 'collection_delay', createdAt: { [Op.gte]: new Date(now - prodAlertMs) } } });
                                if (!recent) {
                                    await Notification.create({ userId: admin.id, title: '🔔 Collection Delay Alert', message: `Agent ${task.deliveryAgent?.name || 'Unknown'} accepted order #${task.order.orderNumber} ${Math.round(elapsedMs / 3600000)}h ago but has not collected yet. Manual follow-up may be needed.`, type: 'collection_delay' });
                                }
                            }
                            if (io) io.to('admin_room').emit('collection_delay_alert', { taskId: task.id, orderId: task.order.id, orderNumber: task.order.orderNumber, agentName: task.deliveryAgent?.name, agentPhone: task.deliveryAgent?.phone, hoursElapsed: Math.round(elapsedMs / 3600000) });
                        }

                    } else if (elapsedMs >= prodWarnMs && !task.warningSentAt) {
                        // Remind agent once
                        console.log(`⏰ [CollectionEnforcer] Product task ${task.id} REMINDER sent to agent.`);
                        await task.update({ warningSentAt: new Date() });
                        if (task.deliveryAgentId) {
                            await Notification.create({ userId: task.deliveryAgentId, title: '📦 Reminder: Collect Order', message: `You accepted Order #${task.order.orderNumber} ${prodWarnMin} minutes ago. Please proceed to collect it from the seller/warehouse.`, type: 'reminder' });
                            if (io) io.to(`user:${task.deliveryAgentId}`).emit('delivery_warning', {
                                taskId: task.id, orderId: task.order.id, orderNumber: task.order.orderNumber,
                                message: `📦 Reminder: Please collect Order #${task.order.orderNumber} — it has been waiting for ${prodWarnMin} minutes.`,
                                minutesLeft: null
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in accepted→collection enforcer cron:', error);
        }
    });

    // Run every 2 minutes - Catch orders stuck in 'awaiting_delivery_assignment'
    // and trigger auto-dispatch if Smart Mode is enabled.
    cron.schedule('*/2 * * * *', async () => {
        try {
            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            if (!config) return;

            const settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
            if (!settings.autoDispatchOrders) return;

            // Find orders in 'awaiting_delivery_assignment' or 'seller_confirmed' status
            // For seller_confirmed, we only want those that DO NOT have an active delivery task.
            const stuckOrders = await Order.findAll({
                where: {
                    status: { [Op.in]: ['awaiting_delivery_assignment', 'seller_confirmed'] }
                },
                include: [{
                    model: DeliveryTask,
                    as: 'deliveryTasks',
                    required: false
                }],
                attributes: ['id', 'orderNumber', 'status']
            });

            // Filter out seller_confirmed orders that already have an active task
            const validStuckOrders = stuckOrders.filter(order => {
                if (order.status === 'awaiting_delivery_assignment') return true;
                // If it's seller_confirmed, it's only stuck if there are no delivery tasks or only failed/cancelled ones
                const hasActiveTask = order.deliveryTasks && order.deliveryTasks.some(t => !['completed', 'failed', 'cancelled', 'rejected'].includes(t.status));
                return !hasActiveTask;
            });

            if (validStuckOrders.length > 0) {
                console.log(`🔄 [AutoDispatch-Cron] Found ${validStuckOrders.length} orders awaiting assignment. Triggering Smart Mode...`);
                for (const order of validStuckOrders) {
                    // First, try to auto-create task if it doesn't exist
                    try {
                        const { autoCreateDeliveryTask } = require('../modules/orders/controllers/transition.controller');
                        await autoCreateDeliveryTask(order, 'order_placed', order.status);
                    } catch (e) {
                        console.error(`[AutoDispatch-Cron] Failed to create task for #${order.orderNumber}:`, e);
                    }

                    autoDispatchService.runAutoDispatch(order.id).catch(err =>
                        console.error(`[AutoDispatch-Cron] Failed dispatch for #${order.orderNumber}:`, err)
                    );
                }
            }
        } catch (error) {
            console.error('❌ Error in auto-dispatch stuck orders cron:', error);
        }
    });

    // ─── CRON: Seller Confirmation Alert ───
    // Runs every 30 minutes — alerts admin when a seller has not confirmed an order within the configured threshold
    cron.schedule('*/30 * * * *', async () => {
        try {
            const { Order, PlatformConfig, Notification, User } = require('../database/models.registry');
            const { getIO } = require('../realtime/socket');

            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            let sellerConfirmAlertHours = 6;
            if (config) {
                try {
                    const s = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    if (s.sellerConfirmAlertHours) sellerConfirmAlertHours = parseFloat(s.sellerConfirmAlertHours);
                } catch (e) {}
            }

            const threshold = new Date(Date.now() - sellerConfirmAlertHours * 60 * 60 * 1000);

            const unconfirmedOrders = await Order.findAll({
                where: {
                    status: 'order_placed',
                    sellerConfirmed: false,
                    createdAt: { [Op.lte]: threshold },
                    paymentConfirmed: true  // Only alert for paid orders
                },
                include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'businessName'] }],
                attributes: ['id', 'orderNumber', 'createdAt', 'sellerId']
            });

            if (unconfirmedOrders.length === 0) return;
            console.log(`🔔 [SellerConfirmAlert] ${unconfirmedOrders.length} orders unconfirmed after ${sellerConfirmAlertHours}h.`);

            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'super_admin', 'superadmin'] } },
                attributes: ['id']
            });
            const io = getIO();

            for (const order of unconfirmedOrders) {
                const sellerName = order.seller?.businessName || order.seller?.name || `Seller #${order.sellerId}`;
                const hoursAgo = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 3600000);

                for (const admin of admins) {
                    const recent = await Notification.findOne({
                        where: { userId: admin.id, type: 'seller_confirm_delay', createdAt: { [Op.gte]: new Date(Date.now() - sellerConfirmAlertHours * 60 * 60 * 1000) } }
                    });
                    if (recent) continue;

                    await Notification.create({
                        userId: admin.id,
                        title: '🕐 Seller Not Confirming Order',
                        message: `Order #${order.orderNumber} placed ${hoursAgo}h ago has not been confirmed by ${sellerName}. Contact them or confirm manually.`,
                        type: 'seller_confirm_delay'
                    });
                }

                if (io) {
                    io.to('admin_room').emit('seller_confirm_delay', {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        sellerName,
                        sellerPhone: order.seller?.phone,
                        hoursAgo
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in seller confirmation alert cron:', error);
        }
    });


    cron.schedule('0 * * * *', async () => {
        console.log('🕒 Running auto-cancel unpaid orders check...');
        try {
            // Get auto-cancel threshold from config (default 24 hours)
            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            let cancelHours = 24;
            if (config) {
                try {
                    const settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    if (settings.autoCancelUnpaidHours) {
                        cancelHours = parseFloat(settings.autoCancelUnpaidHours);
                    }
                } catch (e) {
                    console.error('[AutoCancel] Failed to parse logistic_settings:', e.message);
                }
            }

            const threshold = new Date(Date.now() - cancelHours * 60 * 60 * 1000);

            // Find unconfirmed prepay orders older than threshold
            const unpaidOrders = await Order.findAll({
                where: {
                    paymentConfirmed: false,
                    paymentType: 'prepay',
                    status: { [Op.notIn]: ['cancelled', 'failed', 'delivered', 'completed'] },
                    createdAt: { [Op.lte]: threshold }
                },
                include: [{
                    model: OrderItem,
                    as: 'OrderItems',
                    include: [{ model: Product, as: 'Product' }]
                }]
            });

            if (unpaidOrders.length === 0) return;

            console.log(`🕒 [AutoCancel] Found ${unpaidOrders.length} unpaid orders to cancel (threshold: ${cancelHours}h).`);

            for (const order of unpaidOrders) {
                const t = await sequelize.transaction();
                try {
                    // 1. Update order status
                    await order.update({
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancelReason: `Auto-cancelled by system: Payment not confirmed within ${cancelHours} hours.`,
                        cancelledBy: 'system',
                        deliveryAgentId: null
                    }, { transaction: t });

                    // 2. Restore Stock
                    for (const item of order.OrderItems || []) {
                        if ((item.itemType === 'product' || item.productId) && item.Product) {
                            await item.Product.update({
                                stock: item.Product.stock + (item.quantity || 0)
                            }, { transaction: t });
                        }
                    }

                    // 3. Revert Pending Wallet Credits
                    const sellerPayout = Number(order.total || 0) - Number(order.deliveryFee || 0);
                    if (sellerPayout > 0 && order.sellerId) {
                        await revertPending(order.sellerId, sellerPayout, order.id, t);
                    }

                    // Revert Delivery Agent Credits
                    const charges = await DeliveryCharge.findAll({ where: { orderId: order.id }, transaction: t });
                    for (const charge of charges) {
                        if (charge.payeeUserId && charge.agentAmount > 0) {
                            await revertPending(charge.payeeUserId, charge.agentAmount, order.id, t);
                        }
                        await charge.update({
                            fundingStatus: 'reversed',
                            note: 'System auto-cancelled: Unpaid order timeout'
                        }, { transaction: t });
                    }

                    // 4. Update Delivery Tasks
                    await DeliveryTask.update(
                        { status: 'cancelled', notes: 'System auto-cancelled: Unpaid order timeout' },
                        { where: { orderId: order.id, status: { [Op.notIn]: ['delivered', 'completed', 'cancelled'] } }, transaction: t }
                    );

                    // 5. Update Payment records
                    await Payment.update(
                        { status: 'cancelled', failureReason: 'Payment timeout' },
                        { where: { orderId: order.id, status: ['pending', 'processing'] }, transaction: t }
                    );

                    await t.commit();

                    // Real-time notification to user
                    try {
                        const { getIO } = require('../realtime/socket');
                        const io = getIO();
                        if (io) {
                            io.to(`user:${order.userId}`).emit('orderStatusUpdate', {
                                orderId: order.id,
                                status: 'cancelled',
                                orderNumber: order.orderNumber,
                                autoCancelled: true
                            });
                        }
                    } catch (_) { }

                    console.log(`✅ [AutoCancel] Order #${order.orderNumber} auto-cancelled successfully.`);

                } catch (innerErr) {
                    await t.rollback();
                    console.error(`❌ [AutoCancel] Failed for order #${order.orderNumber}:`, innerErr.message);
                }
            }
        } catch (error) {
            console.error('❌ Error in auto-cancel unpaid orders cron:', error);
        }
    });

    // Run every 30 minutes - Stuck Delivery Detector
    // Finds tasks stuck in 'in_progress' for too long and alerts admin WITHOUT auto-failing them
    cron.schedule('*/30 * * * *', async () => {
        try {
            const { DeliveryTask, PlatformConfig, Notification, User } = require('../database/models.registry');
            const { getIO } = require('../realtime/socket');

            // Get stuck threshold from config (default 3 hours)
            const config = await PlatformConfig.findOne({ where: { key: 'logistic_settings' } });
            let stuckHours = 3;
            if (config) {
                try {
                    const settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    if (settings.stuckDeliveryHours) {
                        stuckHours = parseInt(settings.stuckDeliveryHours, 10);
                    }
                } catch (e) { }
            }

            const stuckThreshold = new Date(Date.now() - stuckHours * 60 * 60 * 1000);

            const stuckTasks = await DeliveryTask.findAll({
                where: {
                    status: 'in_progress',
                    startedAt: { [Op.lte]: stuckThreshold }
                },
                include: [
                    { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'deliveryAddress'] },
                    { model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }
                ]
            });

            if (stuckTasks.length === 0) return;

            console.log(`🚨 [StuckDetector] Found ${stuckTasks.length} deliveries stuck in progress!`);

            // Find all admin users to notify
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'super_admin', 'superadmin'] } },
                attributes: ['id']
            });

            const io = getIO();

            for (const task of stuckTasks) {
                const agentName = task.deliveryAgent?.name || 'Unknown Agent';
                const orderNumber = task.order?.orderNumber || task.orderId;
                const hoursElapsed = stuckHours;
                const title = '🚨 Delivery Stuck Alert';
                const message = `Order #${orderNumber} has been in transit for over ${hoursElapsed} hours (Agent: ${agentName}). Manual follow-up may be needed.`;

                // Create DB notification for each admin
                for (const admin of admins) {
                    // Avoid duplicate alerts — check if one was sent in the last hour
                    const recentAlert = await Notification.findOne({
                        where: {
                            userId: admin.id,
                            type: 'stuck_delivery',
                            createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }
                        }
                    });
                    if (recentAlert) continue; // Skip if recently alerted

                    await Notification.create({
                        userId: admin.id,
                        title,
                        message,
                        type: 'stuck_delivery'
                    });
                }

                // Real-time push to admin dashboard
                if (io) {
                    io.to('admin_room').emit('stuck_delivery_alert', {
                        taskId: task.id,
                        orderId: task.order?.id,
                        orderNumber,
                        agentName,
                        agentPhone: task.deliveryAgent?.phone,
                        hoursElapsed,
                        message
                    });
                }

                console.log(`🚨 [StuckDetector] Alert sent for order #${orderNumber} (Agent: ${agentName}).`);
            }
        } catch (error) {
            console.error('❌ Error in stuck delivery detector:', error);
        }
    });

    // Run every 4 minutes - Revert Pending Wallet Credits
    cron.schedule('0 4 * * *', async () => {
        console.log('⏰ Running wallet credit reversion task...');
        try {
            const pendingOrders = await Order.findAll({
                where: { status: 'pending' },
                include: [{ model: User, as: 'seller' }]
            });

            for (const order of pendingOrders) {
                await revertPending(order.sellerId, order.totalAmount, order.id);
            }

            console.log('✅ Wallet credits reverted for pending orders.');
        } catch (error) {
            console.error('❌ Error reverting wallet credits:', error);
        }
    });

    console.log('✅ Scheduled tasks initialized.');

    // ─── DISABLED: Auto-confirm agent→customer delivery after 5 min ──
    // This was causing the handover section to disappear prematurely for customers
    // if there was any slight time desync or if the delivery took longer than 5 mins.

    // cron.schedule('*/2 * * * *', async () => {
    //     try {
    //         const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    //
    //         // Find pending agent_to_customer codes that are 5+ minutes old
    //         const staleCodes = await HandoverCode.findAll({
    //             where: {
    //                 handoverType: 'agent_to_customer',
    //                 status: 'pending',
    //                 createdAt: { [Op.lte]: fiveMinutesAgo }
    //             },
    //             include: [
    //                 { model: Order, as: 'order' },
    //                 { model: DeliveryTask, as: 'task' }
    //             ]
    //         });
    //
    //         if (staleCodes.length === 0) return;
    //
    //         console.log(`🚚 [AutoDeliver] Auto-confirming ${staleCodes.length} unconfirmed delivery handovers (5-min rule)...`);
    //
    //         for (const handoverCode of staleCodes) {
    //             const t = await sequelize.transaction();
    //             try {
    //                 // Mark code as confirmed (system-auto)
    //                 await handoverCode.update({
    //                     status: 'confirmed',
    //                     confirmerId: handoverCode.initiatorId, // agent self-confirms as system action
    //                     confirmedAt: new Date(),
    //                     notes: 'Auto-confirmed: customer did not enter code within 5 minutes.'
    //                 }, { transaction: t });
    //
    //                 // Update order to delivered
    //                 if (handoverCode.order) {
    //                     await handoverCode.order.update({
    //                         status: 'delivered',
    //                         actualDelivery: new Date()
    //                     }, { transaction: t });
    //
    //                     // Notify customer
    //                     try {
    //                         await Notification.create({
    //                             userId: handoverCode.order.userId,
    //                             title: '✅ Order Delivered',
    //                             message: `Your order #${handoverCode.order.orderNumber} has been marked as delivered.`,
    //                             type: 'success'
    //                         }, { transaction: t });
    //                     } catch (_) {}
    //                 }
    //
    //                 // Complete the delivery task
    //                 if (handoverCode.task) {
    //                     await handoverCode.task.update({
    //                         status: 'completed',
    //                         completedAt: new Date()
    //                     }, { transaction: t });
    //                 }
    //
    //                 await t.commit();
    //
    //                 // Real-time push
    //                 try {
    //                     const { getIO } = require('../realtime/socket');
    //                     const io = getIO();
    //                     if (io && handoverCode.order) {
    //                         io.to(`user:${handoverCode.order.userId}`).emit('orderStatusUpdate', {
    //                             orderId: handoverCode.order.id,
    //                             status: 'delivered',
    //                             orderNumber: handoverCode.order.orderNumber,
    //                             autoDelivered: true
    //                         });
    //                         io.to('admin').emit('orderStatusUpdate', {
    //                             orderId: handoverCode.order.id,
    //                             status: 'delivered',
    //                             orderNumber: handoverCode.order.orderNumber,
    //                             autoDelivered: true
    //                         });
    //                     }
    //                 } catch (_) {}
    //
    //                 console.log(`✅ [AutoDeliver] Order #${handoverCode.order?.orderNumber} auto-delivered.`);
    //             } catch (innerErr) {
    //                 await t.rollback();
    //                 console.error(`❌ [AutoDeliver] Failed for handover ${handoverCode.id}:`, innerErr.message);
    //             }
    //         }
    //     } catch (error) {
    //         console.error('❌ [AutoDeliver] Error in auto-delivery cron:', error);
    // });
};

module.exports = { initScheduledTasks };

