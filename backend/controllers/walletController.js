const { User, Wallet, Transaction } = require('../models');

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
    description: note || "Top-up"
  });

  res.json({ message: "Wallet credited", balance: (wallet.balance || 0) + amount });
};

const withdraw = async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

  await wallet.decrement({ balance: amount });
  await Transaction.create({
    userId: req.user.id,
    amount,
    type: "debit",
    status: "pending",
    description: "Withdrawal"
  });

  res.json({ message: "Withdrawal queued", balance: (wallet.balance || 0) - amount });
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
    description: `Airtime ${phone}`
  });

  res.json({ message: "Airtime purchase simulated", balance: (wallet.balance || 0) - amount });
};

module.exports = {
  getWallet,
  getUserWallet,
  creditWallet,
  withdraw,
  buyAirtime
};
