/**
 * System Settlement & Production Reset Script
 * 
 * This script prepares the system for production by:
 * 1. Marking all pending/in-progress orders as 'delivered' and 'paid'.
 * 2. Completing all active delivery tasks.
 * 3. Clearing all pending commissions.
 * 4. Zeroing out all user wallet balances with an audit trail.
 * 5. Zeroing out the platform wallet.
 * 
 * Usage: node scripts/system-settlement-reset-production.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { 
  sequelize, 
  Order, 
  Wallet, 
  Transaction, 
  DeliveryTask, 
  Commission, 
  PlatformWallet, 
  PlatformTransaction,
  Op 
} = require('../models');

async function settleSystem() {
  const t = await sequelize.transaction();
  
  try {
    console.log('🚀 Starting System Settlement Reset...');

    // 1. Settle Orders
    console.log('📦 Settling Orders...');
    const [orderCount] = await Order.update({
      status: 'delivered',
      paymentConfirmed: true,
      actualDelivery: new Date()
    }, {
      where: {
        status: {
          [Op.notIn]: ['delivered', 'completed', 'cancelled', 'returned', 'failed']
        }
      },
      transaction: t
    });
    console.log(`   ✅ ${orderCount} orders marked as delivered.`);

    // 2. Settle Delivery Tasks
    console.log('🚚 Settling Delivery Tasks...');
    const [taskCount] = await DeliveryTask.update({
      status: 'completed',
      completedAt: new Date()
    }, {
      where: {
        status: {
          [Op.notIn]: ['completed', 'cancelled']
        }
      },
      transaction: t
    });
    console.log(`   ✅ ${taskCount} delivery tasks marked as completed.`);

    // 3. Settle Commissions
    console.log('💰 Settling Commissions...');
    const [commissionCount] = await Commission.update({
      status: 'paid',
      paidAt: new Date()
    }, {
      where: {
        status: 'pending'
      },
      transaction: t
    });
    console.log(`   ✅ ${commissionCount} commissions marked as paid.`);

    // 4. Settle User Wallets
    console.log('💳 Settling User Wallets...');
    const wallets = await Wallet.findAll({
      where: {
        [Op.or]: [
          { balance: { [Op.gt]: 0 } },
          { pendingBalance: { [Op.gt]: 0 } },
          { successBalance: { [Op.gt]: 0 } }
        ]
      },
      transaction: t
    });

    for (const wallet of wallets) {
      const totalToReset = (parseFloat(wallet.balance) || 0) + 
                           (parseFloat(wallet.pendingBalance) || 0) + 
                           (parseFloat(wallet.successBalance) || 0);
      
      if (totalToReset > 0) {
        // Create settlement transaction
        await Transaction.create({
          userId: wallet.userId,
          amount: -totalToReset,
          type: 'debit',
          status: 'completed',
          description: 'System Settlement Reset (Production Prep)',
          note: `Final settlement of balances: Balance=${wallet.balance}, Pending=${wallet.pendingBalance}, Success=${wallet.successBalance}`,
          walletType: 'customer' // Defaulting to customer for cleanup
        }, { transaction: t });

        // Zero out wallet
        await wallet.update({
          balance: 0,
          pendingBalance: 0,
          successBalance: 0
        }, { transaction: t });
      }
    }
    console.log(`   ✅ ${wallets.length} user wallets zeroed out.`);

    // 5. Settle Platform Wallet
    console.log('🏢 Settling Platform Wallet...');
    const platformWallet = await PlatformWallet.findByPk(1, { transaction: t, lock: true });
    if (platformWallet && parseFloat(platformWallet.balance) > 0) {
      const currentBalance = parseFloat(platformWallet.balance);
      
      await PlatformTransaction.create({
        walletId: platformWallet.id,
        amount: currentBalance,
        type: 'debit',
        sourceType: 'platform_withdrawal',
        description: 'System Settlement Reset (Production Prep)',
        metadata: { resetAt: new Date() }
      }, { transaction: t });

      await platformWallet.update({
        balance: 0,
        totalWithdrawn: parseFloat(platformWallet.totalWithdrawn || 0) + currentBalance
      }, { transaction: t });
      
      console.log(`   ✅ Platform wallet zeroed out (KES ${currentBalance}).`);
    } else {
      console.log('   ℹ️ Platform wallet already zero or not found.');
    }

    await t.commit();
    console.log('✨ System Settlement Reset Complete!');
  } catch (error) {
    await t.rollback();
    console.error('❌ Settlement Failed:', error);
    process.exit(1);
  }
}

settleSystem().then(() => process.exit(0));
