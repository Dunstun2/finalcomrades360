const { Wallet, Transaction } = require('../models');

const getMarketerWallet = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create wallet
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 });
        }

        // Get transactions
        const transactions = await Transaction.findAll({
            where: { userId, walletType: 'marketer' },
            order: [['createdAt', 'DESC']]
        });

        // Get min payout threshold for marketers
        let minPayout = 500; // default
        try {
            const { PlatformConfig } = require('../models');
            const configRecord = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
            if (configRecord) {
                const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
                minPayout = (dbConfig.minPayout || {})['marketer'] || 500;
            }
        } catch (e) { /* use default */ }

        res.json({
            balance: wallet.balance || 0,
            pendingBalance: wallet.pendingBalance || 0,
            successBalance: wallet.successBalance || 0,
            minPayout,
            transactions: transactions.map(tx => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                status: tx.status,
                description: tx.description || tx.note || 'Marketer Transaction',
                createdAt: tx.createdAt
            }))
        });
    } catch (error) {
        console.error('Error fetching marketer wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet data [V3-STALE-CHECK]',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Request a withdrawal
 * POST /api/marketing/wallet/withdraw
 */
const withdraw = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, paymentDetails, paymentMeta } = req.body;

        const { calculateWithdrawalFee } = require('../utils/walletHelpers');

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Get finance settings for threshold and tiered fees
        let financeSettings = {};
        try {
            const { PlatformConfig } = require('../models');
            const configRecord = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
            if (configRecord) financeSettings = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
        } catch (e) { console.error('Error parsing finance settings:', e); }

        // Role-based min payout check for marketer
        const thresholds = financeSettings.minPayout || {};
        const minAmount = thresholds['marketer'] || 500;
        
        if (amount < minAmount) {
            return res.status(400).json({ error: `Minimum withdrawal amount for marketers is KES ${minAmount}` });
        }

        // Calculate Fee
        const fee = calculateWithdrawalFee(amount, financeSettings);
        const netAmount = Math.max(0, amount - fee);

        // Subtract from balance and add a pending transaction
        await wallet.update({
            balance: wallet.balance - amount
        });

        // Build metadata with structured payment info
        const metaObj = {
            method: paymentMethod || 'mpesa',
            details: paymentDetails || req.user.phone,
            marketerName: req.user.name,
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
            note: `Marketer requested payout of KES ${amount}. Fee: KES ${fee}. Net to Pay: KES ${netAmount}.`,
            metadata: JSON.stringify(metaObj),
            fee: fee,
            walletType: 'marketer'
        });

        res.json({ success: true, message: 'Withdrawal request submitted', netAmount, fee });
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process withdrawal request',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getMarketerWallet,
    withdraw
};
