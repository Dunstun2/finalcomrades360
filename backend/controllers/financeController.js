const { Order, PlatformConfig, sequelize, Transaction, Wallet, User, DeliveryCharge, Notification } = require('../models');
const { Op } = require('sequelize');
const { moveToPaid } = require('../utils/walletHelpers');
const { DeliveryTask, OrderItem, Product, FastFood, Warehouse, PickupStation } = require('../models');

// Helper to get agent share percentage (default 70%)
const getAgentSharePercentage = async () => {
    try {
        const config = await PlatformConfig.findOne({ where: { key: 'delivery_fee_agent_share' } });
        return config ? parseFloat(config.value) : 70;
    } catch (error) {
        console.error('Error fetching agent share config:', error);
        return 70; // Default
    }
};

// GET /api/finance/config
const getDeliveryConfig = async (req, res) => {
    try {
        const share = await getAgentSharePercentage();
        res.json({ agentShare: share });
    } catch (error) {
        console.error('Error getting delivery config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
};

// POST /api/finance/config
const updateDeliveryConfig = async (req, res) => {
    try {
        const { agentShare } = req.body;

        if (typeof agentShare !== 'number' || agentShare < 0 || agentShare > 100) {
            return res.status(400).json({ error: 'Share must be a number between 0 and 100' });
        }

        const [config, created] = await PlatformConfig.findOrCreate({
            where: { key: 'delivery_fee_agent_share' },
            defaults: { value: agentShare.toString() }
        });

        if (!created) {
            config.value = agentShare.toString();
            await config.save();
        }

        res.json({ message: 'Configuration updated', agentShare });
    } catch (error) {
        console.error('Error updating delivery config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
};

// GET /api/finance/system-income
// GET /api/finance/system-income
const getSystemIncome = async (req, res) => {
    try {
        const { DeliveryTask, OrderItem, Product, Order } = require('../models');

        // 1. Calculate Delivery Revenue (from completed tasks)
        const completedTasks = await DeliveryTask.findAll({
            where: { status: 'completed' },
            attributes: ['deliveryFee', 'agentEarnings']
        });

        const totalDeliveryFees = completedTasks.reduce((sum, t) => sum + (t.deliveryFee || 0), 0);
        const totalAgentEarnings = completedTasks.reduce((sum, t) => sum + (t.agentEarnings || 0), 0);
        const platformDeliveryEarnings = totalDeliveryFees - totalAgentEarnings;

        // 2. Calculate Item Sales Revenue (Markup)
        // We look at OrderItems from 'delivered' orders
        const deliveredItems = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    where: { status: 'delivered', paymentConfirmed: true },
                    attributes: []
                },
                {
                    model: Product,
                    attributes: ['basePrice']
                }
            ]
        });

        let totalItemSales = 0;
        let totalItemCost = 0;

        deliveredItems.forEach(item => {
            const qty = item.quantity || 1;
            const sellPrice = item.total || 0; // total is usually price * qty

            // Use current product base price as proxy for cost
            const basePrice = item.Product ? parseFloat(item.Product.basePrice || 0) : 0;
            const cost = basePrice * qty;

            totalItemSales += sellPrice;
            totalItemCost += cost;
        });

        const itemSalesProfit = Math.max(0, totalItemSales - totalItemCost);

        // 3. Calculate Withdrawal Fee Revenue (from processed payouts)
        const payoutTransactions = await Transaction.findAll({
            where: {
                type: 'debit',
                status: 'completed'
            },
            attributes: ['fee']
        });

        const totalWithdrawalFees = payoutTransactions.reduce((sum, tx) => sum + (tx.fee || 0), 0);

        res.json({
            // Delivery Revenue Config
            totalDeliveryFees,
            totalAgentEarnings,
            platformDeliveryEarnings,

            // Item Sales Config
            totalItemSales,
            totalItemCost,
            itemSalesProfit,

            // Withdrawal Revenue
            totalWithdrawalFees,

            // Total Platform Revenue
            totalPlatformRevenue: platformDeliveryEarnings + itemSalesProfit + totalWithdrawalFees
        });
    } catch (error) {
        console.error('Error calculating system income:', error);
        res.status(500).json({ error: 'Failed to calculate system income' });
    }
};

// GET /api/finance/pending-payouts
const getPendingPayouts = async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            where: {
                [Op.or]: [
                    { status: 'success' },
                    { type: 'debit', status: 'pending' }
                ]
            },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role', 'phone'] }],
            order: [['createdAt', 'DESC']]
        });

        // Map user to User for frontend compatibility
        const mappedTransactions = transactions.map(tx => {
            const data = tx.toJSON ? tx.toJSON() : tx;
            if (data.user) {
                data.User = data.user;
            }
            return data;
        });

        res.json(mappedTransactions);
    } catch (error) {
        console.error('Error fetching pending payouts:', error);
        res.status(500).json({ error: 'Failed to fetch pending payouts' });
        // Also log to error.log for easier debugging
        const fs = require('fs');
        const path = require('path');
        const errorDetail = `\n--- [getPendingPayouts Error] ${new Date().toISOString()} ---\n${error.stack}\n`;
        fs.appendFileSync(path.join(__dirname, '../error.log'), errorDetail);
    }
};

// POST /api/finance/process-payout
/**
 * Verify and clear pending earnings, moving them from successBalance to withdrawable balance.
 * This process is now termed 'Earning Verification' rather than 'Payout'.
 */
const verifyEarnings = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { transactionIds, referenceNumber, proofUrl } = req.body; // Array of IDs + Proof

        if (!transactionIds || !Array.isArray(transactionIds)) {
            return res.status(400).json({ error: 'transactionIds array is required' });
        }

        let totalSystemRevenue = 0;
        let tasksClaimed = 0;

        for (const id of transactionIds) {
            const tx = await Transaction.findByPk(id, {
                include: [{
                    model: Order,
                    as: 'order',
                    include: [{
                        model: DeliveryTask,
                        as: 'deliveryTasks',
                        where: { status: { [Op.in]: ['completed', 'delivered'] } },
                        required: false
                    }]
                }],
                transaction: t
            });

            if (tx && tx.status === 'success') {
                // MOVE TO WITHDRAWABLE BALANCE
                await moveToPaid(tx.userId, tx.amount, id, t);

                // Attach verification proof to the transaction metadata
                const meta = tx.metadata ? (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata) : {};
                meta.verificationProofUrl = proofUrl || meta.verificationProofUrl;
                meta.verificationReference = referenceNumber || meta.verificationReference;
                meta.verifiedAt = new Date();
                await tx.update({ metadata: JSON.stringify(meta) }, { transaction: t });

                // NOTIFICATION: Notify user about verified earnings
                try {
                    const user = await User.findByPk(tx.userId, { transaction: t });
                    if (user && user.phone) {
                        const { getDynamicMessage } = require('../utils/templateUtils');
                        const { sendMessage } = require('../utils/messageService');
                        const msg = await getDynamicMessage('earningVerified', 
                            'Great news! Your earnings of KES {amount} have been verified and added to your balance. 💰', 
                            { name: user.name || 'User', amount: tx.amount }
                        );
                        sendMessage(user.phone, msg, 'whatsapp').catch(e => console.error('Failed to send verification notification:', e.message));
                    }
                } catch (notifyErr) {
                    console.error('Error notifying user about earning verification:', notifyErr.message);
                }

                // AUTOMATION: Claim system revenue for the associated task
                const task = tx.order?.deliveryTasks?.[0];
                if (task && !task.systemRevenueClaimed) {
                    const fee = parseFloat(task.deliveryFee) || 0;
                    const earnings = parseFloat(task.agentEarnings) || 0;
                    const revenue = Math.max(0, fee - earnings);

                    if (revenue > 0) {
                        await task.update({
                            systemRevenueClaimed: true,
                            systemRevenueClaimedAt: new Date(),
                            systemRevenueAmount: revenue 
                        }, { transaction: t });

                        totalSystemRevenue += revenue;
                        tasksClaimed++;

                        // Credit Platform Wallet for delivery share
                        const { PlatformWallet, PlatformTransaction } = require('../models');
                        const wallet = await PlatformWallet.findByPk(1, { transaction: t, lock: true });
                        if (wallet) {
                            wallet.balance = parseFloat(wallet.balance) + revenue;
                            wallet.totalEarned = parseFloat(wallet.totalEarned) + revenue;
                            await wallet.save({ transaction: t });

                            await PlatformTransaction.create({
                                walletId: wallet.id,
                                amount: revenue,
                                type: 'credit',
                                sourceType: 'delivery_share',
                                referenceId: task.id.toString(),
                                description: `Delivery margin for Order ${tx.order?.orderNumber || 'Unknown'}`
                            }, { transaction: t });
                        }
                    } else {
                        await task.update({
                            systemRevenueClaimed: true,
                            systemRevenueClaimedAt: new Date()
                        }, { transaction: t });
                    }
                }
            } else if (tx && tx.type === 'debit' && tx.status === 'pending') {
                // This is a manual withdrawal request from balance (Actual Payout)

                const meta = tx.metadata ? (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata) : {};
                meta.payoutProofUrl = proofUrl || meta.payoutProofUrl;
                meta.payoutReference = referenceNumber || meta.payoutReference;
                meta.processedAt = new Date();

                await tx.update({ 
                    status: 'completed',
                    metadata: JSON.stringify(meta)
                }, { transaction: t });

                // Credit Platform Wallet for the withdrawal fee
                if (tx.fee > 0) {
                    const { PlatformWallet, PlatformTransaction } = require('../models');
                    const wallet = await PlatformWallet.findByPk(1, { transaction: t, lock: true });
                    if (wallet) {
                        wallet.balance = parseFloat(wallet.balance) + parseFloat(tx.fee);
                        wallet.totalEarned = parseFloat(wallet.totalEarned) + parseFloat(tx.fee);
                        await wallet.save({ transaction: t });

                        await PlatformTransaction.create({
                            walletId: wallet.id,
                            amount: parseFloat(tx.fee),
                            type: 'credit',
                            sourceType: 'withdrawal_fee',
                            referenceId: tx.id.toString(),
                            description: `Fee for withdrawal TX-${tx.id}`
                        }, { transaction: t });
                    }
                }

                // Send System Notification
                try {
                    await Notification.create({
                        userId: tx.userId,
                        title: 'Withdrawal Approved',
                        message: `Your withdrawal request for KES ${tx.amount} has been approved and processed! 💰`,
                        type: 'success'
                    }, { transaction: t });
                } catch (notifErr) {
                    console.error('Failed to create system notification for withdrawal:', notifErr.message);
                }

                // NOTIFICATION: Notify user about successful withdrawal
                try {
                    const user = await User.findByPk(tx.userId, { transaction: t });
                    if (user) {
                        const { getDynamicMessage, getEnabledChannels } = require('../utils/templateUtils');
                        const { sendMessage } = require('../utils/messageService');
                        
                        const channels = await getEnabledChannels('withdrawalStatus');
                        const amount = formatPrice(tx.amount);

                        if (channels.whatsapp && user.phone) {
                            const msg = await getDynamicMessage('withdrawalStatus', 
                                'Your withdrawal of {amount} has been processed successfully! 💰', 
                                { amount }
                            );
                            sendMessage(user.phone, msg, 'whatsapp').catch(e => console.error('Failed to send withdrawal WhatsApp:', e.message));
                        }
                        if (channels.sms && user.phone) {
                            const msg = await getDynamicMessage('withdrawalStatus', 
                                'Your withdrawal of {amount} has been processed successfully!',
                                { amount }
                            );
                            sendMessage(user.phone, msg, 'sms').catch(e => console.error('Failed to send withdrawal SMS:', e.message));
                        }
                        if (channels.email && user.email) {
                            const subject = await getDynamicMessage('withdrawalSuccessEmailSubject', 'Withdrawal Processed', { amount });
                            const body = await getDynamicMessage('withdrawalSuccessEmailBody', 
                                'Hi {name}, your withdrawal of {amount} has been processed successfully. It should reflect in your account shortly.',
                                { name: user.name, amount }
                            );
                            sendMessage(user.email, { subject, body }, 'email').catch(e => console.error('Failed to send withdrawal email:', e.message));
                        }
                    }
                } catch (notifyErr) {
                    console.error('Error notifying user about withdrawal approval:', notifyErr.message);
                }
            }
        }

        // Record total platform revenue if any was collected
        if (totalSystemRevenue > 0) {
            await Transaction.create({
                userId: req.user.id, // Admin who processed verification
                type: 'system_delivery_revenue',
                amount: totalSystemRevenue,
                status: 'completed',
                description: `System revenue auto-collected from ${tasksClaimed} verified earnings`,
                metadata: JSON.stringify({ source: 'earning_verification', verificationTxIds: transactionIds })
            }, { transaction: t });
        }

        await t.commit();
        res.json({
            message: 'Earnings verified successfully',
            systemRevenueCollected: totalSystemRevenue,
            tasksSettled: tasksClaimed
        });
    } catch (error) {
        await t.rollback();
        console.error('Error verifying earnings:', error);
        res.status(500).json({ error: 'Failed to verify earnings', detail: error.message });
    }
};

// GET /api/finance/success-balances
// Only returns users who have successBalance > 0 (cleared funds awaiting payout)
// Optional ?role= query parameter
const getSuccessBalances = async (req, res) => {
    try {
        const { role } = req.query;
        const where = {};
        if (role) {
            const { Sequelize } = User.sequelize;
            where[Op.or] = [
                { role: role },
                Sequelize.where(
                    Sequelize.cast(Sequelize.col('User.roles'), 'CHAR'),
                    { [Op.like]: `%"${role}"%` }
                )
            ];
        }

        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'phone', 'email', 'role'],
            include: [{
                model: Wallet,
                as: 'wallet',
                where: { successBalance: { [Op.gt]: 0 } },
                required: true,
                attributes: ['successBalance', 'pendingBalance', 'balance']
            }],
            order: [
                [{ model: Wallet, as: 'wallet' }, 'successBalance', 'DESC']
            ]
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching success balances:', error);
        res.status(500).json({ error: 'Failed to fetch success balances', detail: error.message });
    }
};

// GET /api/finance/delivery-task-history
// Global history of ALL completed delivery tasks with agent, amounts, system revenue
const getDeliveryTaskHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const offset = (page - 1) * pageSize;
        const agentId = req.query.agentId || null;

        const agentShare = await getAgentSharePercentage();

        const whereClause = {
            status: { [Op.in]: ['completed', 'delivered'] }
        };
        if (agentId) whereClause.deliveryAgentId = agentId;

        const { count, rows: tasks } = await DeliveryTask.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'orderNumber', 'total', 'deliveryFee', 'status', 'createdAt', 'updatedAt'],
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'name', 'phone', 'businessName'] },
                        { model: User, as: 'seller', attributes: ['id', 'name', 'businessName'] },
                        {
                            model: OrderItem,
                            as: 'OrderItems',
                            attributes: ['id', 'quantity', 'price', 'deliveryFee'],
                            include: [
                                { model: Product, as: 'Product', attributes: ['id', 'name'], required: false },
                                { model: FastFood, as: 'FastFood', attributes: ['id', 'name'], required: false }
                            ]
                        }
                    ]
                },
                { model: User, as: 'agent', attributes: ['id', 'name', 'phone'] }
            ],
            order: [['updatedAt', 'DESC']],
            limit: pageSize,
            offset
        });

        // Compute system revenue per task
        const enriched = tasks.map(task => {
            const lockedShare = parseFloat(task.agentShare) || agentShare;
            const totalFee = parseFloat(task.deliveryFee) || 0;
            const agentEarnings = parseFloat(task.agentEarnings) || (totalFee * (lockedShare / 100));
            const systemRevenue = totalFee - agentEarnings;
            return {
                id: task.id,
                orderId: task.orderId,
                orderNumber: task.order?.orderNumber,
                deliveryType: task.deliveryType,
                status: task.status,
                agent: task.agent ? { id: task.agent.id, name: task.agent.name, phone: task.agent.phone } : null,
                customer: task.order?.user ? { id: task.order.user.id, name: task.order.user.name, phone: task.order.user.phone } : null,
                seller: task.order?.seller ? { id: task.order.seller.id, name: task.order.seller.name } : null,
                totalDeliveryFee: totalFee,
                agentShare: lockedShare,
                agentEarnings,
                systemRevenue,
                systemRevenueClaimed: task.systemRevenueClaimed || false,
                systemRevenueClaimedAt: task.systemRevenueClaimedAt || null,
                orderTotal: parseFloat(task.order?.total) || 0,
                itemCount: task.order?.OrderItems?.length || 0,
                completedAt: task.updatedAt,
                createdAt: task.createdAt
            };
        });

        res.json({
            data: enriched,
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize)
        });
    } catch (error) {
        console.error('Error fetching delivery task history:', error);
        res.status(500).json({ error: 'Failed to fetch delivery task history', detail: error.message });
    }
};

// POST /api/finance/collect-system-revenue
// Mark system revenue as collected for selected delivery task IDs
const collectSystemRevenue = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { taskIds } = req.body;
        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ error: 'taskIds array is required' });
        }

        const agentSharePct = await getAgentSharePercentage();

        const tasks = await DeliveryTask.findAll({
            where: {
                id: { [Op.in]: taskIds },
                status: { [Op.in]: ['completed', 'delivered'] },
                systemRevenueClaimed: { [Op.ne]: true }
            },
            transaction: t
        });

        let totalCollected = 0;
        for (const task of tasks) {
            const lockedShare = parseFloat(task.agentShare) || agentSharePct;
            const totalFee = parseFloat(task.deliveryFee) || 0;
            const agentEarnings = parseFloat(task.agentEarnings) || (totalFee * (lockedShare / 100));
            const systemShare = totalFee - agentEarnings;
            totalCollected += systemShare;

            await task.update({
                systemRevenueClaimed: true,
                systemRevenueClaimedAt: new Date(),
                systemRevenueAmount: systemShare
            }, { transaction: t });
        }

        // Record in a platform revenue Transaction if the model supports it
        if (totalCollected > 0) {
            await Transaction.create({
                userId: req.user.id,
                type: 'system_delivery_revenue',
                amount: totalCollected,
                status: 'completed',
                description: `System delivery revenue collected from ${tasks.length} task(s)`,
                metadata: JSON.stringify({ taskIds, collectedAt: new Date() })
            }, { transaction: t });
        }

        await t.commit();
        res.json({
            message: `System revenue collected from ${tasks.length} tasks`,
            totalCollected,
            tasksProcessed: tasks.length
        });
    } catch (error) {
        await t.rollback();
        console.error('Error collecting system revenue:', error);
        res.status(500).json({ error: 'Failed to collect system revenue', detail: error.message });
    }
};

// GET /api/finance/automatic-payout-status?type=delivery|earning
const getAutomaticPayoutStatus = async (req, res) => {
    try {
        const { type = 'delivery' } = req.query;
        const key = type === 'delivery' ? 'automatic_delivery_payout_enabled' : 'automatic_earning_verification_enabled';
        
        const config = await PlatformConfig.findOne({ where: { key } });
        res.json({ enabled: config ? config.value === 'true' : false, type });
    } catch (error) {
        console.error('Error getting automatic payout status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
};

// POST /api/finance/toggle-automatic-payout
const toggleAutomaticPayout = async (req, res) => {
    try {
        const { enabled, type = 'delivery' } = req.body;
        const key = type === 'delivery' ? 'automatic_delivery_payout_enabled' : 'automatic_earning_verification_enabled';

        const [config, created] = await PlatformConfig.findOrCreate({
            where: { key },
            defaults: { value: enabled ? 'true' : 'false' }
        });

        if (!created) {
            config.value = enabled ? 'true' : 'false';
            await config.save();
        }

        const label = type === 'delivery' ? 'Automatic delivery payout' : 'Automatic earning verification';
        res.json({ 
            message: `${label} ${enabled ? 'enabled' : 'disabled'}`, 
            enabled,
            type
        });
    } catch (error) {
        console.error('Error toggling automatic payout:', error);
        res.status(500).json({ error: 'Failed to toggle automatic payout' });
    }
};

// GET /api/finance/success-transactions/:userId
const getSuccessTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { DeliveryTask, OrderItem, Product, FastFood, Warehouse, PickupStation } = require('../models');

        const transactions = await Transaction.findAll({
            where: {
                userId,
                status: 'success'
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: DeliveryTask,
                            as: 'deliveryTasks',
                            // Try to match the task for this user if they are an agent
                            where: { deliveryAgentId: userId },
                            required: false
                        },
                        {
                            model: OrderItem,
                            as: 'OrderItems',
                            include: [
                                { model: Product, attributes: ['id', 'name'] },
                                { model: FastFood, attributes: ['id', 'name'] }
                            ]
                        },
                        { model: User, as: 'seller', attributes: ['id', 'name', 'businessAddress', 'businessName'] },
                        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name', 'address'] },
                        { model: PickupStation, as: 'PickupStation', attributes: ['id', 'name', 'location', 'lat', 'lng'] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching success transactions:', error);
        res.status(500).json({ error: 'Failed to fetch success transactions' });
    }
};

const getDeliveryChargeLedger = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const pageSize = parseInt(req.query.pageSize || '50', 10);
        const offset = (page - 1) * pageSize;
        const where = {};

        if (req.query.payerType) where.payerType = req.query.payerType;
        if (req.query.fundingStatus) where.fundingStatus = req.query.fundingStatus;
        if (req.query.routeType) where.routeType = req.query.routeType;

        const { count, rows } = await DeliveryCharge.findAndCountAll({
            where,
            include: [
                { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'status', 'paymentConfirmed'] },
                { model: DeliveryTask, as: 'deliveryTask', attributes: ['id', 'deliveryType', 'status', 'deliveryFee', 'agentEarnings'] },
                { model: User, as: 'payer', attributes: ['id', 'name', 'email', 'phone'], required: false },
                { model: User, as: 'payee', attributes: ['id', 'name', 'email', 'phone'], required: false }
            ],
            order: [['updatedAt', 'DESC']],
            limit: pageSize,
            offset
        });

        res.json({
            data: rows,
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize)
        });
    } catch (error) {
        console.error('Error fetching delivery charge ledger:', error);
        res.status(500).json({ error: 'Failed to fetch delivery charge ledger', detail: error.message });
    }
};

const getDeliveryChargeSummary = async (req, res) => {
    try {
        const where = {};
        if (req.query.fundingStatus) where.fundingStatus = req.query.fundingStatus;

        const charges = await DeliveryCharge.findAll({
            where,
            include: [
                { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'sellerId'] },
                { model: User, as: 'payee', attributes: ['id', 'name'], required: false },
                { model: User, as: 'payer', attributes: ['id', 'name'], required: false }
            ]
        });

        const addToBucket = (map, key, charge) => {
            if (!map[key]) {
                map[key] = {
                    key,
                    count: 0,
                    grossAmount: 0,
                    chargedAmount: 0,
                    outstandingAmount: 0,
                    agentAmount: 0,
                    platformAmount: 0
                };
            }

            map[key].count += 1;
            map[key].grossAmount += Number(charge.grossAmount || 0);
            map[key].chargedAmount += Number(charge.chargedAmount || 0);
            map[key].outstandingAmount += Number(charge.outstandingAmount || 0);
            map[key].agentAmount += Number(charge.agentAmount || 0);
            map[key].platformAmount += Number(charge.platformAmount || 0);
        };

        const payerTypeGroup = {};
        const routeTypeGroup = {};
        const sellerGroup = {};
        const agentGroup = {};

        charges.forEach((charge) => {
            addToBucket(payerTypeGroup, charge.payerType || 'unknown', charge);
            addToBucket(routeTypeGroup, charge.routeType || 'unknown', charge);

            const sellerId = charge.order?.sellerId || null;
            const sellerKey = sellerId ? String(sellerId) : 'unknown';
            if (!sellerGroup[sellerKey]) {
                sellerGroup[sellerKey] = {
                    sellerId,
                    sellerName: sellerId && charge.order?.seller ? charge.order.seller.name : null,
                    count: 0,
                    grossAmount: 0,
                    chargedAmount: 0,
                    outstandingAmount: 0,
                    agentAmount: 0,
                    platformAmount: 0
                };
            }
            addToBucket({ [sellerKey]: sellerGroup[sellerKey] }, sellerKey, charge);

            const agentId = charge.payeeUserId || null;
            const agentKey = agentId ? String(agentId) : 'unknown';
            if (!agentGroup[agentKey]) {
                agentGroup[agentKey] = {
                    agentId,
                    agentName: charge.payee?.name || null,
                    count: 0,
                    grossAmount: 0,
                    chargedAmount: 0,
                    outstandingAmount: 0,
                    agentAmount: 0,
                    platformAmount: 0
                };
            }
            addToBucket({ [agentKey]: agentGroup[agentKey] }, agentKey, charge);
        });

        const totals = charges.reduce((acc, charge) => {
            acc.count += 1;
            acc.grossAmount += Number(charge.grossAmount || 0);
            acc.chargedAmount += Number(charge.chargedAmount || 0);
            acc.outstandingAmount += Number(charge.outstandingAmount || 0);
            acc.agentAmount += Number(charge.agentAmount || 0);
            acc.platformAmount += Number(charge.platformAmount || 0);
            return acc;
        }, {
            count: 0,
            grossAmount: 0,
            chargedAmount: 0,
            outstandingAmount: 0,
            agentAmount: 0,
            platformAmount: 0
        });

        res.json({
            totals,
            byPayerType: Object.values(payerTypeGroup),
            byRouteType: Object.values(routeTypeGroup),
            bySeller: Object.values(sellerGroup),
            byAgent: Object.values(agentGroup)
        });
    } catch (error) {
        console.error('Error fetching delivery charge summary:', error);
        res.status(500).json({ error: 'Failed to fetch delivery charge summary', detail: error.message });
    }
};

const settleLogisticsCharge = async (req, res) => {
    try {
        const { chargeId } = req.params;
        const { note } = req.body;

        const charge = await DeliveryCharge.findByPk(chargeId, {
            include: [{ model: Order, as: 'order' }]
        });

        if (!charge) {
            return res.status(404).json({ error: 'Logistics charge not found' });
        }

        if (charge.fundingStatus === 'settled') {
            return res.status(400).json({ error: 'Charge is already settled' });
        }

        await charge.update({
            fundingStatus: 'settled',
            chargedAmount: charge.grossAmount,
            outstandingAmount: 0,
            settledAt: new Date(),
            note: note ? `${charge.note || ''} | Manual Settlement: ${note}` : charge.note
        });

        res.json({ message: 'Logistics charge settled successfully', charge });
    } catch (error) {
        console.error('Error settling logistics charge:', error);
        res.status(500).json({ error: 'Failed to settle logistics charge', detail: error.message });
    }
};

/**
 * GET /api/finance/seller-sales-history
 * Returns a history of sales (orders) for a specific seller with financial breakdown.
 */
const getSellerSalesHistory = async (req, res) => {
    try {
        const { sellerId } = req.query;

        const page = parseInt(req.query.page || '1', 10);
        const pageSize = parseInt(req.query.pageSize || '50', 10);
        const offset = (page - 1) * pageSize;

        const whereClause = {
            paymentConfirmed: true,
            status: { [Op.ne]: 'cancelled' }
        };
        if (sellerId) {
            whereClause.sellerId = sellerId;
        }

        const { count, rows: orders } = await Order.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: OrderItem,
                    as: 'OrderItems',
                    attributes: ['id', 'quantity', 'price', 'total', 'commissionRate', 'commissionAmount'],
                    include: [
                        { model: Product, as: 'Product', attributes: ['id', 'name'], required: false },
                        { model: FastFood, as: 'FastFood', attributes: ['id', 'name'], required: false }
                    ]
                },
                { model: User, as: 'user', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'seller', attributes: ['id', 'name', 'phone'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset
        });

        const data = orders.map(order => {
            const items = order.OrderItems || [];
            const grossSale = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            const totalCommission = items.reduce((sum, item) => sum + (parseFloat(item.commissionAmount) || 0), 0);
            const netEarning = grossSale - totalCommission;

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                seller: order.seller ? { name: order.seller.name, phone: order.seller.phone } : null,
                customer: order.user ? { name: order.user.name, phone: order.user.phone } : null,
                status: order.status,
                createdAt: order.createdAt,
                grossSale,
                totalCommission,
                netEarning,
                itemCount: items.length,
                items: items.map(i => ({
                    name: i.Product?.name || i.FastFood?.name || 'Unknown Item',
                    quantity: i.quantity,
                    price: i.price,
                    total: i.total
                }))
            };
        });

        res.json({
            data,
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize)
        });
    } catch (error) {
        console.error('Error fetching seller sales history:', error);
        res.status(500).json({ error: 'Failed to fetch seller sales history', detail: error.message });
    }
};

module.exports = {
    getDeliveryConfig,
    updateDeliveryConfig,
    getSystemIncome,
    getPendingPayouts,
    verifyEarnings,
    getSuccessBalances,
    getSuccessTransactions,
    getAutomaticPayoutStatus,
    toggleAutomaticPayout,
    getDeliveryTaskHistory,
    collectSystemRevenue,
    getDeliveryChargeLedger,
    getDeliveryChargeSummary,
    getSellerSalesHistory,
    settleLogisticsCharge
};
