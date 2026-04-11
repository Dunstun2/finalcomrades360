/**
 * Backfill walletType on existing Transaction records.
 * 
 * Infers walletType from the transaction's description, then falls back
 * to the user's primary role for any remaining untagged rows.
 *
 * Usage:  node scripts/backfill-wallet-types.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize, Transaction, User } = require('../models');

const DESCRIPTION_RULES = [
  // Seller patterns
  { pattern: /sale earning/i, walletType: 'seller' },
  { pattern: /seller/i, walletType: 'seller' },
  { pattern: /logistics fee/i, walletType: 'seller' },

  // Delivery agent patterns
  { pattern: /delivery earning/i, walletType: 'delivery_agent' },
  { pattern: /agent/i, walletType: 'delivery_agent' },

  // Marketer patterns
  { pattern: /commission earning/i, walletType: 'marketer' },
  { pattern: /marketer/i, walletType: 'marketer' },

  // Customer patterns
  { pattern: /top-up/i, walletType: 'customer' },
  { pattern: /airtime/i, walletType: 'customer' },
  { pattern: /refund/i, walletType: 'customer' },
  { pattern: /payment for order/i, walletType: 'customer' },

  // Withdrawal patterns — infer from note field
  { pattern: /seller requested payout/i, walletType: 'seller', field: 'note' },
  { pattern: /agent requested/i, walletType: 'delivery_agent', field: 'note' },
  { pattern: /marketer requested payout/i, walletType: 'marketer', field: 'note' },
  { pattern: /provider requested payout/i, walletType: 'service_provider', field: 'note' },
  { pattern: /user requested payout/i, walletType: 'customer', field: 'note' },
];

// Map user roles to wallet types
const ROLE_TO_WALLET = {
  seller: 'seller',
  delivery_agent: 'delivery_agent',
  marketer: 'marketer',
  service_provider: 'service_provider',
  customer: 'customer',
  user: 'customer',
  admin: 'customer',
  super_admin: 'customer',
  superadmin: 'customer',
};

async function backfill() {
  console.log('🔄 Starting walletType backfill...');

  // 1. Fetch all transactions without a walletType
  const untagged = await Transaction.findAll({
    where: { walletType: null },
    attributes: ['id', 'userId', 'description', 'note', 'type'],
  });

  console.log(`📊 Found ${untagged.length} transactions without walletType.`);

  let matchedByDesc = 0;
  let matchedByRole = 0;
  let unmatched = 0;
  const batchUpdates = [];

  // 2. Try to match by description / note
  for (const tx of untagged) {
    let matched = false;
    const desc = tx.description || '';
    const note = tx.note || '';

    for (const rule of DESCRIPTION_RULES) {
      const text = rule.field === 'note' ? note : desc;
      if (rule.pattern.test(text)) {
        batchUpdates.push({ id: tx.id, walletType: rule.walletType });
        matchedByDesc++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      batchUpdates.push({ id: tx.id, walletType: null, userId: tx.userId }); // will resolve by role
    }
  }

  // 3. For unmatched, look up the user's role
  const needsRoleLookup = batchUpdates.filter(u => u.walletType === null);
  if (needsRoleLookup.length > 0) {
    const userIds = [...new Set(needsRoleLookup.map(u => u.userId))];
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'role'],
    });
    const roleMap = new Map(users.map(u => [u.id, u.role]));

    for (const update of needsRoleLookup) {
      const role = roleMap.get(update.userId);
      const wt = ROLE_TO_WALLET[role] || 'customer';
      update.walletType = wt;
      matchedByRole++;
    }
  }

  // 4. Apply updates in chunks
  const finalUpdates = batchUpdates.filter(u => u.walletType);
  const CHUNK_SIZE = 100;

  for (let i = 0; i < finalUpdates.length; i += CHUNK_SIZE) {
    const chunk = finalUpdates.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(u =>
        Transaction.update({ walletType: u.walletType }, { where: { id: u.id } })
      )
    );
    console.log(`  ✅ Updated ${Math.min(i + CHUNK_SIZE, finalUpdates.length)} / ${finalUpdates.length}`);
  }

  unmatched = batchUpdates.length - matchedByDesc - matchedByRole;

  console.log('\n📊 Backfill Summary:');
  console.log(`  Matched by description: ${matchedByDesc}`);
  console.log(`  Matched by user role:   ${matchedByRole}`);
  console.log(`  Unmatched:              ${unmatched}`);
  console.log(`  Total updated:          ${finalUpdates.length}`);
  console.log('✅ Backfill complete!');
}

(async () => {
  try {
    await sequelize.authenticate();
    await backfill();
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
