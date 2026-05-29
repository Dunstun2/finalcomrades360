const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { DeliveryTask, Order, User } = require('../models');

// Quick accept route: GET /api/quick-action/accept?taskId=...&agentId=...&token=...
router.get('/accept', async (req, res) => {
    try {
        const { taskId, agentId, token } = req.query;

        if (!taskId || !agentId || !token) {
            return res.status(400).send(`
                <html><body>
                <h2 style="color:red">Invalid Link</h2>
                <p>Missing required parameters.</p>
                </body></html>
            `);
        }

        // Verify token
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const expectedToken = crypto.createHmac('sha256', secret)
            .update(taskId.toString() + agentId.toString())
            .digest('hex');

        if (token !== expectedToken) {
            return res.status(403).send(`
                <html><body>
                <h2 style="color:red">Invalid or Expired Link</h2>
                <p>This security token is invalid.</p>
                </body></html>
            `);
        }

        // Find the task
        const task = await DeliveryTask.findOne({
            where: { id: taskId, deliveryAgentId: agentId },
            include: [{ model: Order, as: 'order' }]
        });

        if (!task) {
            return res.status(404).send(`
                <html><body>
                <h2 style="color:red">Task Not Found</h2>
                <p>We could not find this delivery assignment.</p>
                </body></html>
            `);
        }

        const dashboardUrl = `${process.env.FRONTEND_URL || 'https://comrades360.shop'}/dashboard/delivery`;

        if (['accepted', 'arrived_at_pickup', 'in_progress', 'completed'].includes(task.status)) {
            return res.status(200).send(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #2e7d32;">✅ Already Accepted!</h2>
                <p>This task is already accepted and in progress.</p>
                <a href="${dashboardUrl}" style="display:inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Dashboard</a>
                </body></html>
            `);
        }

        if (task.status !== 'requested' && task.status !== 'assigned') {
            return res.status(400).send(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #d32f2f;">❌ Cannot Accept Task</h2>
                <p>This task is currently in status: <strong>${task.status}</strong></p>
                <a href="${dashboardUrl}" style="display:inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Dashboard</a>
                </body></html>
            `);
        }

        // Accept the task
        task.status = 'accepted';
        task.acceptedAt = new Date();
        await task.save();

        // Check and update order status if needed
        if (task.order) {
            if (task.order.status === 'awaiting_delivery_assignment') {
                task.order.status = 'processing';
                task.order.processingAt = new Date();
                await task.order.save();
            } else if (task.order.status === 'ordered') {
                task.order.status = 'processing';
                task.order.processingAt = new Date();
                await task.order.save();
            }
        }

        // Try emitting to sockets if possible (soft fail if not)
        try {
            const { getIO } = require('../realtime/socket');
            const io = getIO();
            if (io) {
                io.to(`user_${agentId}`).emit('deliveryTaskUpdated', task);
                io.to('admin').emit('deliveryRequestUpdate', { orderId: task.orderId, status: 'accepted' });
            }
        } catch(e) {
            console.error('[QuickAccept] Socket emit failed (non-fatal):', e.message);
        }

        return res.status(200).send(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f9fbfd;">
            <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 50px; margin-bottom: 10px;">🚚✅</div>
                <h2 style="color: #2e7d32; margin-bottom: 10px;">Task Accepted!</h2>
                <p style="color: #555; margin-bottom: 30px;">You have successfully accepted Order #${task.order ? task.order.orderNumber : task.orderId}.</p>
                <a href="${dashboardUrl}" style="display:block; padding: 15px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
            </body></html>
        `);

    } catch (error) {
        console.error('[QuickAccept] Error:', error);
        res.status(500).send(`
            <html><body>
            <h2 style="color:red">Server Error</h2>
            <p>An error occurred while accepting the task. Please try again in the dashboard.</p>
            </body></html>
        `);
    }
});

// Quick reject route: GET /api/quick-action/reject?taskId=...&agentId=...&token=...
router.get('/reject', async (req, res) => {
    try {
        const { taskId, agentId, token } = req.query;

        if (!taskId || !agentId || !token) {
            return res.status(400).send(`
                <html><body>
                <h2 style="color:red">Invalid Link</h2>
                <p>Missing required parameters.</p>
                </body></html>
            `);
        }

        // Verify token
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const expectedToken = crypto.createHmac('sha256', secret)
            .update(taskId.toString() + agentId.toString())
            .digest('hex');

        if (token !== expectedToken) {
            return res.status(403).send(`
                <html><body>
                <h2 style="color:red">Invalid or Expired Link</h2>
                <p>This security token is invalid.</p>
                </body></html>
            `);
        }

        // Find the task
        const task = await DeliveryTask.findOne({
            where: { id: taskId, deliveryAgentId: agentId },
            include: [{ model: Order, as: 'order' }]
        });

        if (!task) {
            return res.status(404).send(`
                <html><body>
                <h2 style="color:red">Task Not Found</h2>
                <p>We could not find this delivery assignment.</p>
                </body></html>
            `);
        }

        const dashboardUrl = `${process.env.FRONTEND_URL || 'https://comrades360.shop'}/dashboard/delivery`;

        if (task.status === 'rejected') {
            return res.status(200).send(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #d32f2f;">❌ Already Rejected</h2>
                <p>This task has already been rejected/declined.</p>
                <a href="${dashboardUrl}" style="display:inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Dashboard</a>
                </body></html>
            `);
        }

        if (task.status !== 'requested' && task.status !== 'assigned') {
            return res.status(400).send(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #d32f2f;">❌ Cannot Reject Task</h2>
                <p>This task is currently in status: <strong>${task.status}</strong> and cannot be rejected.</p>
                <a href="${dashboardUrl}" style="display:inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Open Dashboard</a>
                </body></html>
            `);
        }

        // Get user (agent) name for notifications
        const agent = await User.findByPk(agentId);
        const agentName = agent ? agent.name : 'Delivery Agent';

        const { sequelize } = require('../database/database');
        const { revertPending } = require('../utils/walletHelpers');
        const { notifyAdminTaskRejection } = require('../utils/notificationHelpers');
        const autoDispatchService = require('../services/autoDispatchService');
        const { PlatformConfig } = require('../models');

        const t = await sequelize.transaction();
        try {
            await task.update({
                status: 'rejected',
                rejectionReason: 'Quick Action Rejection via Notification',
                deliveryAgentId: null // Unassign agent
            }, { transaction: t });

            // Revert wallet pending credit if any
            const share = parseFloat(task.agentShare) || 70;
            const earnings = (parseFloat(task.deliveryFee) || 0) * (share / 100);
            if (earnings > 0) {
                await revertPending(agentId, earnings, task.orderId, t);
            }

            // Unassign from order
            if (task.order) {
                await task.order.update({ deliveryAgentId: null }, { transaction: t });

                // Notify admins
                await notifyAdminTaskRejection(task.orderId, task.order.orderNumber, agentName, 'Quick Action Rejection via Notification');

                // Trigger Smart Auto-Dispatch if enabled
                try {
                    const configRecord = await PlatformConfig.findOne({ where: { key: 'logistic_settings' }, transaction: t });
                    const settings = configRecord ? (typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value) : {};
                    if (settings.autoDispatchOrders) {
                        // Exclude the current agent who just rejected it
                        autoDispatchService.runAutoDispatch(task.orderId, { excludeAgentIds: [agentId] })
                            .catch(err => console.error('[QuickReject] AutoDispatch Failed:', err));
                    }
                } catch (e) {
                    console.error('[QuickReject] AutoDispatch Config check failed:', e);
                }
            }

            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }

        // Try emitting to sockets if possible (soft fail if not)
        try {
            const { getIO } = require('../realtime/socket');
            const io = getIO();
            if (io) {
                io.to(`user_${agentId}`).emit('deliveryTaskUpdated', task);
                io.to('admin').emit('deliveryRequestUpdate', { orderId: task.orderId, status: 'rejected' });
            }
        } catch(e) {
            console.error('[QuickReject] Socket emit failed (non-fatal):', e.message);
        }

        return res.status(200).send(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #fdfaf9;">
            <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 50px; margin-bottom: 10px;">❌🚚</div>
                <h2 style="color: #d32f2f; margin-bottom: 10px;">Task Declined</h2>
                <p style="color: #555; margin-bottom: 30px;">You have declined Order #${task.order ? task.order.orderNumber : task.orderId}. The task has been reassigned to other agents.</p>
                <a href="${dashboardUrl}" style="display:block; padding: 15px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
            </body></html>
        `);

    } catch (error) {
        console.error('[QuickReject] Error:', error);
        res.status(500).send(`
            <html><body>
            <h2 style="color:red">Server Error</h2>
            <p>An error occurred while declining the task. Please try again in the dashboard.</p>
            </body></html>
        `);
    }
});

module.exports = router;
