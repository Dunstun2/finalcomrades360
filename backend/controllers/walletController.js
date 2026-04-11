const { User, Wallet, Transaction, PlatformConfig } = require('../models');
const { calculateWithdrawalFee } = require('../utils/walletHelpers');

const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create wallet
    let wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 });
    }

    // Get transactions
    const transactions = await Transaction.findAll({
      where: { userId, walletType: 'customer' },
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
        description: tx.description || tx.note || 'Transaction',
        createdAt: tx.createdAt
      }))
    });
  } catch (error) {
    console.error('Error in getWallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
};

const getUserWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = id;

    // Get or create wallet
    let wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, pendingBalance: 0, successBalance: 0 });
    }

    res.json({
      balance: wallet.balance || 0,
      pendingBalance: wallet.pendingBalance || 0,
      successBalance: wallet.successBalance || 0
    });
  } catch (error) {
    console.error('Error in getUserWallet:', error);
    res.status(500).json({ error: 'Failed to fetch user wallet' });
  }
};

const creditWallet = async (req, res) => {
  const { amount, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const u = await User.findByPk(req.user.id);
  const wallet = await Wallet.findOne({ where: { userId: u.id } });

  await wallet.increment({ balance: amount });
  await Transaction.create({
    userId: u.id,
    amount,
    type: "credit",
    status: "completed",
    description: note || "Top-up",
    walletType: 'customer'
  });

  res.json({ message: "Wallet credited", balance: (wallet.balance || 0) + amount });
};

const withdraw = async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const u = await User.findByPk(req.user.id);
  const role = u.role || 'customer';

  // Role-based min payout check
  try {
    const { PlatformConfig } = require('../models');
    const configRecord = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
    if (configRecord) {
      const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
      const thresholds = dbConfig.minPayout || {};
      const minAmount = thresholds[role] || 0;
      
      if (amount < minAmount) {
        return res.status(400).json({ error: `Minimum withdrawal amount for ${role} is KES ${minAmount}` });
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not check payout threshold:', err.message);
  }

  const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

  // Get finance settings for fee calculation
  let financeSettings = {};
  try {
    const configRecord = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
    if (configRecord) {
      financeSettings = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
    }
  } catch (err) {
    console.warn('⚠️  Could not fetch finance settings for fee:', err.message);
  }

  const fee = calculateWithdrawalFee(amount, financeSettings);
  const netAmount = Math.max(0, amount - fee);

  const { paymentMethod, paymentDetails, paymentMeta } = req.body;

  // Build metadata
  const metaObj = {
    method: paymentMethod || 'mpesa',
    details: paymentDetails || u.phone,
    userName: u.name,
    requestedAmount: amount,
    withdrawalFee: fee,
    netAmountToPay: netAmount,
    ...(paymentMeta || {})
  };

  await wallet.decrement({ balance: amount });
  await Transaction.create({
    userId: req.user.id,
    amount,
    type: "debit",
    status: "pending",
    description: `Withdrawal (${paymentMethod === 'bank' ? 'Bank' : 'M-Pesa'})`,
    metadata: JSON.stringify(metaObj),
    fee: fee,
    note: `User requested payout of KES ${amount}. Fee: KES ${fee}. Net to Pay: KES ${netAmount}.`,
    walletType: 'customer'
  });

  res.json({ 
    message: "Withdrawal queued", 
    balance: (wallet.balance || 0) - amount,
    fee,
    netAmount
  });
};

const withdrawFunds = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;

    try {
        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct from balance
        await wallet.decrement({ balance: amount });

        // Record transaction
        await Transaction.create({
            userId,
            amount,
            type: 'debit',
            status: 'completed',
            description: 'Withdrawal',
            walletType: 'customer'
        });

        res.json({ message: 'Withdrawal successful', balance: wallet.balance - amount });
    } catch (error) {
        res.status(500).json({ message: 'Error processing withdrawal', error: error.message });
    }
};

const buyAirtime = async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: "Missing fields" });

  const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

  await wallet.decrement({ balance: amount });
  await Transaction.create({
    userId: req.user.id,
    amount,
    type: "debit",
    status: "completed",
    description: `Airtime ${phone}`,
    walletType: 'customer'
  });

  res.json({ message: "Airtime purchase simulated", balance: (wallet.balance || 0) - amount });
};

const handlePendingBalance = async (userId, amount) => {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet || wallet.pendingBalance < amount) {
        throw new Error('Insufficient pending balance');
    }
    await wallet.decrement({ pendingBalance: amount });
};

const validatePayoutThreshold = async (role, amount) => {
    const config = await PlatformConfig.findOne({ where: { key: 'finance_settings' } });
    const thresholds = config ? JSON.parse(config.value).minPayout || {} : {};
    const minAmount = thresholds[role] || 0;
    if (amount < minAmount) {
        throw new Error(`Minimum payout for ${role} is ${minAmount}`);
    }
};

module.exports = {
  getWallet,
  getUserWallet,
  creditWallet,
  withdraw,
  withdrawFunds,
  buyAirtime,
  handlePendingBalance,
  validatePayoutThreshold
};
