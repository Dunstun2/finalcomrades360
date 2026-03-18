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
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            balance: wallet.balance || 0,
            pendingBalance: wallet.pendingBalance || 0,
            successBalance: wallet.successBalance || 0,
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
        const { amount, paymentMethod, paymentDetails } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Subtract from balance and add a pending transaction
        // In a real system, you might want a separate WithdrawalRequest model
        // but for now we'll use a transaction with status 'pending'

        await wallet.update({
            balance: wallet.balance - amount
        });

        await Transaction.create({
            userId,
            amount,
            type: 'debit',
            status: 'pending',
            description: 'Withdrawal Request',
            note: `Marketer requested payout of KES ${amount}`
        });

        res.json({ success: true, message: 'Withdrawal request submitted' });
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
