const { Wallet, Transaction } = require('../../../database/models.registry');

class BillingService {
  /**
   * Helper to fetch or initialize a user's wallet with write locks
   */
  async getOrCreateWallet(userId, transaction) {
    let wallet = await Wallet.findOne({
      where: { userId },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : false
    });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        pendingBalance: 0,
        successBalance: 0
      }, { transaction });
    }

    return wallet;
  }

  /**
   * Deduct funds from user wallet.
   */
  async chargeWallet(userId, amount, description, options = {}) {
    const { transaction } = options;
    const chargeAmount = parseFloat(amount);

    if (isNaN(chargeAmount) || chargeAmount <= 0) {
      throw new Error('Invalid billing amount');
    }

    const wallet = await this.getOrCreateWallet(userId, transaction);

    if (wallet.balance < chargeAmount) {
      throw new Error('Insufficient wallet balance for subscription renewal');
    }

    // Decrement balance
    await wallet.decrement({ balance: chargeAmount }, { transaction });

    // Create completed Transaction record
    await Transaction.create({
      userId,
      amount: chargeAmount,
      type: 'debit',
      status: 'completed',
      description,
      note: description,
      walletType: 'customer'
    }, { transaction });

    return wallet;
  }

  /**
   * Refund or Credit funds to user wallet.
   */
  async creditWallet(userId, amount, description, options = {}) {
    const { transaction } = options;
    const creditAmount = parseFloat(amount);

    if (isNaN(creditAmount) || creditAmount <= 0) {
      throw new Error('Invalid credit amount');
    }

    const wallet = await this.getOrCreateWallet(userId, transaction);

    // Increment balance
    await wallet.increment({ balance: creditAmount }, { transaction });

    // Create completed Transaction record
    await Transaction.create({
      userId,
      amount: creditAmount,
      type: 'credit',
      status: 'completed',
      description,
      note: description,
      walletType: 'customer'
    }, { transaction });

    return wallet;
  }

  /**
   * Calculates the remaining value of a subscription to apply as a credit for upgrading.
   */
  calculateProratedCredit(currentSubscription, currentPlan) {
    const now = new Date();
    const expiry = new Date(currentSubscription.expiryDate);
    const start = new Date(currentSubscription.startDate);

    if (expiry <= now) return 0.00;

    const totalDuration = expiry.getTime() - start.getTime();
    const remainingDuration = expiry.getTime() - now.getTime();

    if (totalDuration <= 0) return 0.00;

    const fraction = remainingDuration / totalDuration;
    const planPrice = parseFloat(currentPlan.price) || 0;
    
    // Prorated credit amount
    const prorated = planPrice * fraction;
    return parseFloat(prorated.toFixed(2));
  }
}

module.exports = new BillingService();
