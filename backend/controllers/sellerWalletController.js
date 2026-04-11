const { Wallet, Transaction } = require('../models');

const getSellerWallet = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create wallet
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 });
        }

        // Get transactions with order details
        const transactions = await Transaction.findAll({
            where: { userId, walletType: 'seller' },
            include: [
                {
                    model: require('../models').Order,
                    as: 'order',
                    attributes: ['id', 'orderNumber', 'status', 'createdAt'],
                    include: [
                        {
                            model: require('../models').OrderItem,
                            as: 'OrderItems',
                            attributes: ['id', 'name', 'quantity', 'price', 'basePrice', 'total', 'itemType']
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
            transactions: transactions.map(tx => {
                const txData = {
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.type,
                    status: tx.status,
                    description: tx.description || tx.note || 'Seller Transaction',
                    createdAt: tx.createdAt,
                    orderId: tx.orderId
                };

                // Add order details if available
                if (tx.order) {
                    txData.orderNumber = tx.order.orderNumber;
                    txData.orderItems = tx.order.OrderItems.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        basePrice: item.basePrice || item.price // Fallback to price for old orders
                    }));
                    // Summarize items for the list view
                    txData.itemSummary = txData.orderItems
                        .map(item => `${item.name} x${item.quantity}`)
                        .join(', ');
                }

                return txData;
            })
        });
    } catch (error) {
        console.error('Error fetching seller wallet:', error);
        res.status(500).json({ error: 'Failed to fetch wallet data' });
    }
};

/**
 * Request a withdrawal for seller
 * POST /api/seller/wallet/withdraw
 */
const withdraw = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, paymentDetails, paymentMeta } = req.body;

        const { calculateWithdrawalFee } = require('../utils/walletHelpers');
        const { PlatformConfig } = require('../models');

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet || (wallet.balance || 0) < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Get finance settings for threshold and tiered fees
        let financeSettings = {};
        try {
            const configRecord = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
            if (configRecord) financeSettings = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
        } catch (e) { console.error('Error parsing finance settings:', e); }

        // Check min payout threshold
        const thresholds = financeSettings.minPayout || {};
        const minAmount = thresholds['seller'] || 1000;

        if (amount < minAmount) {
            return res.status(400).json({ error: `Minimum withdrawal amount for sellers is KES ${minAmount}` });
        }

        // Calculate Fee
        const fee = calculateWithdrawalFee(amount, financeSettings);
        const netAmount = Math.max(0, amount - fee);

        // Subtract full amount from balance (lock the funds)
        await wallet.update({
            balance: wallet.balance - amount
        });

        // Build metadata
        const metaObj = {
            method: paymentMethod || 'mpesa',
            details: paymentDetails || req.user.phone,
            sellerName: req.user.name,
            requestedAmount: amount,
            withdrawalFee: fee,
            netAmountToPay: netAmount,
            ...(paymentMeta || {})
        };

        await Transaction.create({
            userId,
            amount,
            type: 'debit',
            status: 'pending',
            description: `Withdrawal Request (${paymentMethod === 'bank' ? 'Bank Transfer' : 'M-Pesa'})`,
            note: `Seller requested payout of KES ${amount}. Fee: KES ${fee}. Net to Pay: KES ${netAmount}.`,
            metadata: JSON.stringify(metaObj),
            fee: fee,
            walletType: 'seller'
        });

        res.json({ success: true, message: 'Withdrawal request submitted successfully', netAmount, fee });
    } catch (error) {
        console.error('Error processing seller withdrawal:', error);
        res.status(500).json({ error: 'Failed to process withdrawal request' });
    }
};

module.exports = {
    getSellerWallet,
    withdraw
};
