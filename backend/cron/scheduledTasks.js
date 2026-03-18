const cron = require('node-cron');
const { Product, Notification, User, DeletedProduct, Order, HandoverCode, DeliveryTask, sequelize } = require('../models');
const { Op } = require('sequelize');

const initScheduledTasks = () => {
    console.log('⏰ Initializing scheduled tasks...');

    // Run every day at 9:00 AM - Low Stock Check
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
            const deletedCount = await DeletedProduct.destroy({
                where: {
                    autoDeleteAt: {
                        [Op.lte]: now
                    }
                }
            });
            console.log(`✅ Permanently deleted ${deletedCount} expired products from recycle bin.`);
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

    // Run every 15 minutes - Cleanup Expired Stock Reservations
    cron.schedule('*/15 * * * *', async () => {
        console.log('🔄 Running stock reservation cleanup...');
        try {
            const { cleanupExpiredReservations } = require('../controllers/inventoryController');
            await cleanupExpiredReservations();
        } catch (error) {
            console.error('❌ Error in stock reservation cleanup:', error);
        }
    });

    // Run every 30 minutes - Process Payment Retry Queue
    cron.schedule('*/30 * * * *', async () => {
        console.log('💳 Processing payment retry queue...');
        try {
            const { processRetryQueue } = require('../controllers/paymentEnhancementsController');
            await processRetryQueue();
        } catch (error) {
            console.error('❌ Error in payment retry queue processing:', error);
        }
    });

    // Run every day at 10:00 AM - Enhanced Low Stock Notifications
    cron.schedule('0 10 * * *', async () => {
        console.log('📊 Running enhanced low stock check...');
        try {
            const { checkLowStockAndNotify } = require('../controllers/inventoryController');
            await checkLowStockAndNotify();
        } catch (error) {
            console.error('❌ Error in enhanced low stock check:', error);
        }
    });

    // Run every 5 minutes - Auto-expire unaccepted delivery task assignments (30-min window)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const { DeliveryTask } = require('../models');
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

            const expiredTasks = await DeliveryTask.findAll({
                where: {
                    status: 'assigned',
                    assignedAt: { [Op.lte]: thirtyMinutesAgo }
                },
                include: [{ model: Order, as: 'order' }]
            });

            if (expiredTasks.length === 0) return;

            console.log(`⏰ [DeliveryExpiry] Expiring ${expiredTasks.length} unaccepted delivery tasks...`);

            for (const task of expiredTasks) {
                await task.update({ status: 'failed' });

                if (task.order) {
                    const revertStatus = task.order.sellerConfirmed ? 'seller_confirmed' : 'order_placed';
                    await task.order.update({
                        deliveryAgentId: null,
                        status: revertStatus
                    });
                    console.log(`↩️  Order #${task.order.orderNumber} reverted to '${revertStatus}' — agent did not accept in time.`);
                }
            }
        } catch (error) {
            console.error('❌ Error in delivery task expiry cleanup:', error);
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

