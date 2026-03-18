const { Wallet, Transaction } = require('../models');

/**
 * Credits the pending balance of a user and creates a pending transaction.
 */
const creditPending = async (userId, amount, description, orderId = null, transaction = null) => {
    if (amount <= 0) return;

    let wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 }, { transaction });
    }

    await wallet.update({
        pendingBalance: (wallet.pendingBalance || 0) + amount
    }, { transaction });

    await Transaction.create({
        userId,
        amount,
        type: 'credit',
        status: 'pending',
        description,
        orderId
    }, { transaction });
};

/**
 * Moves funds from pendingBalance to successBalance and updates transaction status.
 */
const moveToSuccess = async (userId, amount, orderNumber, description, orderId = null, transaction = null) => {
    if (amount <= 0) return;

    const { PlatformConfig } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (wallet) {
        await wallet.update({
            pendingBalance: Math.max(0, (wallet.pendingBalance || 0) - amount),
            successBalance: (wallet.successBalance || 0) + amount
        }, { transaction });

        // Update the transaction status from pending to success
        // Prefer lookup by orderId, fallback to description containing orderNumber
        const txWhere = { userId, status: 'pending' };
        if (orderId) {
            txWhere.orderId = orderId;
        } else {
            txWhere.description = { [require('sequelize').Op.like]: `%#${orderNumber}%` };
        }

        const tx = await Transaction.findOne({
            where: txWhere,
            transaction
        });

        let successTxId = null;
        if (tx) {
            await tx.update({ status: 'success' }, { transaction });
            successTxId = tx.id;
        } else {
            // Fallback: Create a new success transaction if not found (though ideally we update existing)
            const newTx = await Transaction.create({
                userId,
                amount,
                type: 'credit',
                status: 'success',
                description: `${description} (Cleared Pending)`,
                orderId
            }, { transaction });
            successTxId = newTx.id;
        }

        // CHECK FOR AUTOMATIC PAYOUT MODE
        try {
            const autoPayoutConfig = await PlatformConfig.findOne({
                where: { key: 'automatic_delivery_payout_enabled' },
                transaction
            });

            if (autoPayoutConfig && autoPayoutConfig.value === 'true') {
                console.log(`[walletHelpers] Automatic payout enabled. Moving ${amount} to balance for user ${userId}`);
                await moveToPaid(userId, amount, successTxId, transaction);
            }
        } catch (error) {
            console.error('[walletHelpers] Error checking automatic payout config:', error);
        }
    }
};

/**
 * Moves funds from successBalance to balance (withdrawable) and updates transaction status.
 */
const moveToPaid = async (userId, amount, transactionId = null, transaction = null) => {
    if (amount <= 0) return;

    const wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (wallet) {
        await wallet.update({
            successBalance: Math.max(0, (wallet.successBalance || 0) - amount),
            balance: (wallet.balance || 0) + amount
        }, { transaction });

        if (transactionId) {
            const tx = await Transaction.findByPk(transactionId, { transaction });
            if (tx) {
                await tx.update({ status: 'completed', description: tx.description + ' (Paid)' }, { transaction });
            }
        }
    }
};

/**
 * Reverts a pending credit (e.g. if assignment is rejected/cancelled).
 */
const revertPending = async (userId, amount, orderId, transaction = null) => {
    if (amount <= 0) return;

    const wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (wallet) {
        await wallet.update({
            pendingBalance: Math.max(0, (wallet.pendingBalance || 0) - amount)
        }, { transaction });

        // Update the transaction from pending to cancelled
        const tx = await Transaction.findOne({
            where: { userId, orderId, status: 'pending' },
            transaction
        });

        if (tx) {
            await tx.update({ status: 'cancelled', description: tx.description + ' (Reverted/Rejected)' }, { transaction });
        }
    }
};

module.exports = {
    creditPending,
    moveToSuccess,
    moveToPaid,
    revertPending
};
