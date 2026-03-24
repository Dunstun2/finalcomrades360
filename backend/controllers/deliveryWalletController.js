const { Wallet, Transaction, PlatformConfig, Order, OrderItem, DeliveryTask, User } = require('../models');

const getDeliveryWallet = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create wallet
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 });
        }

        // Get settings
        const config = await PlatformConfig.findOne({ where: { key: 'delivery_fee_agent_share' } });
        const sharePercent = config ? parseFloat(config.value) : 70;

        const autoPayoutConfig = await PlatformConfig.findOne({ where: { key: 'automatic_delivery_payout_enabled' } });
        const autoPayoutEnabled = autoPayoutConfig ? autoPayoutConfig.value === 'true' : false;

        // Get transactions with order details and associated delivery tasks
        const transactions = await Transaction.findAll({
            where: { userId },
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'orderNumber', 'status', 'createdAt', 'deliveryType', 'deliveryFee'],
                    include: [
                        {
                            model: OrderItem,
                            as: 'OrderItems',
                            attributes: ['id', 'name', 'quantity', 'price', 'total', 'itemType', 'deliveryFee']
                        },
                        {
                            model: DeliveryTask,
                            as: 'deliveryTasks', // Assuming the association exists or we fallback
                            attributes: ['id', 'deliveryType', 'agentEarnings', 'agentShare', 'deliveryFee', 'status']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            balance: wallet.balance || 0,
            pendingBalance: wallet.pendingBalance || 0,
            successBalance: wallet.successBalance || 0,
            autoPayoutEnabled,
            transactions: transactions.map(tx => {
                const txData = {
                    id: tx.id,
                    amount: tx.amount, // The actual credited amount (the share)
                    type: tx.type,
                    status: tx.status,
                    description: tx.description || tx.note || 'Delivery Transaction',
                    createdAt: tx.createdAt,
                    orderId: tx.orderId
                };

                // Add order details if available
                if (tx.order) {
                    txData.orderNumber = tx.order.orderNumber;

                    // Identify the relevant task for this transaction
                    // (Recent task matching the order status or specific type if possible)
                    const relevantTask = tx.order.deliveryTasks?.find(t =>
                        tx.description.includes(t.deliveryType) ||
                        (t.status === 'completed' && Math.abs(t.agentEarnings - tx.amount) < 0.01)
                    ) || tx.order.deliveryTasks?.[0];

                    const totalTaskFee = parseFloat(relevantTask?.deliveryFee) || parseFloat(tx.order.deliveryFee) || 0;
                    const agentSharePercent = parseFloat(relevantTask?.agentShare) || sharePercent;
                    const agentShareAmount = relevantTask?.agentEarnings != null
                        ? parseFloat(relevantTask.agentEarnings) || 0
                        : totalTaskFee * (agentSharePercent / 100);

                    txData.aggregateBreakdown = {
                        totalTaskFee,
                        agentSharePercent,
                        agentShareAmount
                    };

                    txData.orderItems = tx.order.OrderItems.map(item => {
                        const itemDeliveryFee = parseFloat(item.deliveryFee) || 0;

                        return {
                            name: item.name,
                            quantity: item.quantity,
                            deliveryFee: itemDeliveryFee,
                            agentShare: 0
                        };
                    });

                    // If it's a logistics route, add a specific breakdown entry for the fixed fee
                    if (relevantTask && ['seller_to_warehouse', 'warehouse_to_seller', 'seller_to_pickup_station', 'pickup_station_to_seller'].includes(relevantTask.deliveryType)) {
                        txData.logisticsInfo = {
                            route: relevantTask.deliveryType,
                            totalTaskFee: relevantTask.deliveryFee,
                            agentSharePercent: relevantTask.agentShare
                        };
                    }

                    // Summarize items for the list view
                    txData.itemSummary = txData.orderItems
                        .map(item => `${item.name} x${item.quantity}`)
                        .join(', ');

                    if (relevantTask && isLogisticsRoute(relevantTask.deliveryType)) {
                        txData.itemSummary = `Logistics: ${relevantTask.deliveryType.replace(/_/g, ' ')}`;
                    }
                }

                return txData;
            })
        });

        function isLogisticsRoute(type) {
            return ['seller_to_warehouse', 'warehouse_to_seller', 'seller_to_pickup_station', 'pickup_station_to_seller'].includes(type);
        }
    } catch (error) {
        console.error('Error fetching delivery wallet:', error);
        res.status(500).json({ error: 'Failed to fetch wallet data' });
    }
};

/**
 * Request a withdrawal for delivery agent
 * POST /api/delivery/wallet/withdraw
 */
const withdraw = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, paymentDetails } = req.body;

        // DEBUG
        const fs = require('fs');
        const path = require('path');
        const logMsg = `[deliveryWalletController] ${new Date().toISOString()} Withdraw Hit: User=${userId}, Amount=${amount}\n`;
        fs.appendFileSync(path.join(__dirname, '../error.log'), logMsg);

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet || (wallet.balance || 0) < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Check min payout threshold
        try {
            const financeSettings = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
            if (financeSettings) {
                const dbConfig = typeof financeSettings.value === 'string' ? JSON.parse(financeSettings.value) : financeSettings.value;
                const thresholds = dbConfig.minPayout || {};
                const minAmount = thresholds['delivery_agent'] || 150; // Default 150 if not set

                if (amount < minAmount) {
                    return res.status(400).json({ error: `Minimum withdrawal amount for delivery agents is KES ${minAmount}` });
                }
            }
        } catch (err) {
            console.warn('[deliveryWallet] Could not check payout threshold:', err.message);
        }

        // Subtract from balance and create pending debit
        await wallet.update({
            balance: wallet.balance - amount
        });

        await Transaction.create({
            userId,
            amount,
            type: 'debit',
            status: 'pending',
            description: `Withdrawal Request (${paymentMethod || 'M-Pesa'})`,
            note: `Delivery Agent requested payout of KES ${amount} to ${paymentDetails || req.user.phone || 'registered number'}.`,
            metadata: JSON.stringify({
                method: paymentMethod || 'mpesa',
                details: paymentDetails || req.user.phone,
                agentName: req.user.name,
                agentRole: req.user.role
            })
        });

        res.json({ success: true, message: 'Withdrawal request submitted successfully' });
    } catch (error) {
        console.error('Error processing delivery withdrawal:', error);
        res.status(500).json({ error: 'Failed to process withdrawal request' });
    }
};

module.exports = {
    getDeliveryWallet,
    withdraw
};
