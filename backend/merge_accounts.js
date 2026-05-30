/**
 * Account Merge Utility for Comrades360
 * 
 * Usage:
 *   node merge_accounts.js <source_identifier> <target_identifier> [--execute]
 * 
 * Examples:
 *   # Dry run (verify what will be merged)
 *   node merge_accounts.js omwengahillary37@gmail.com 0717099913
 * 
 *   # Perform the actual merge
 *   node merge_accounts.js omwengahillary37@gmail.com 0717099913 --execute
 */

const { User, Order, Product, FastFood, Wallet, sequelize, Op } = require('./models');

// Helper to normalize Kenyan phone numbers
const normalizeKenyanPhone = (p = '') => {
  if (!p) return null;
  const s = String(p).replace(/[\s\-\(\)]/g, '');
  if (/^\+254[17]\d{8}$/.test(s)) return s;
  if (/^0[17]\d{8}$/.test(s)) return '+254' + s.slice(1);
  if (/^254[17]\d{8}$/.test(s)) return '+' + s;
  return null;
};

// Robust user search function
const findUser = async (identifier) => {
  if (!identifier) return null;
  const clean = identifier.trim();
  const normalized = normalizeKenyanPhone(clean);

  const searchConditions = [
    { email: clean },
    { email: clean.toLowerCase() }
  ];

  if (normalized) {
    searchConditions.push({ phone: normalized });
    searchConditions.push({ phone: normalized.replace('+', '') });
  } else {
    searchConditions.push({ phone: clean });
    if (/^\d+$/.test(clean)) {
      searchConditions.push({ phone: `+${clean}` });
      searchConditions.push({ phone: { [Op.like]: `%${clean}%` } });
    }
  }

  // Also include soft-deleted users in the lookup in case we need to recover/merge them
  return await User.findOne({
    where: { [Op.or]: searchConditions },
    paranoid: false
  });
};

async function main() {
  const args = process.argv.slice(2);
  const sourceId = args[0];
  const targetId = args[1];
  const execute = args.includes('--execute');

  if (!sourceId || !targetId) {
    console.log(`
❌ Error: Missing arguments.

Usage:
  node merge_accounts.js <source_email_or_phone> <target_email_or_phone> [--execute]

Examples:
  # Check details first (Dry Run):
  node merge_accounts.js omwengahillary37@gmail.com 0717099913

  # Run the actual merge:
  node merge_accounts.js omwengahillary37@gmail.com 0717099913 --execute
`);
    process.exit(1);
  }

  try {
    console.log("------------------------------------------------------------");
    console.log(`🔍 Searching for Source Account: "${sourceId}"...`);
    const sourceUser = await findUser(sourceId);
    
    console.log(`🔍 Searching for Target Account: "${targetId}"...`);
    const targetUser = await findUser(targetId);

    if (!sourceUser) {
      console.error(`❌ Error: Source user "${sourceId}" not found in database.`);
      process.exit(1);
    }

    if (!targetUser) {
      console.error(`❌ Error: Target user "${targetId}" not found in database.`);
      process.exit(1);
    }

    if (sourceUser.id === targetUser.id) {
      console.error(`❌ Error: Source and Target accounts are the same user (ID: ${sourceUser.id}).`);
      process.exit(1);
    }

    // Gather statistics for verification
    const getStats = async (user) => {
      const orders = await Order.count({ where: { userId: user.id } });
      const products = await Product.count({ where: { sellerId: user.id } });
      const fastFood = await FastFood.count({ where: { vendor: user.id } });
      const wallet = await Wallet.findOne({ where: { userId: user.id } });
      return { orders, products, fastFood, walletBalance: wallet ? wallet.balance : (user.walletBalance || 0) };
    };

    const sourceStats = await getStats(sourceUser);
    const targetStats = await getStats(targetUser);

    console.log("------------------------------------------------------------");
    console.log("📂 SOURCE ACCOUNT (Will be deactivated & merged):");
    console.log(`  ID:             ${sourceUser.id}`);
    console.log(`  Name:           ${sourceUser.name}`);
    console.log(`  Email:          ${sourceUser.email}`);
    console.log(`  Phone:          ${sourceUser.phone}`);
    console.log(`  Role:           ${sourceUser.role} (Roles: ${JSON.stringify(sourceUser.roles || [])})`);
    console.log(`  Wallet Balance: KES ${parseFloat(sourceStats.walletBalance).toFixed(2)}`);
    console.log(`  Orders Count:   ${sourceStats.orders}`);
    console.log(`  Products Count: ${sourceStats.products}`);
    console.log(`  FastFood Count: ${sourceStats.fastFood}`);
    if (sourceUser.deletedAt) {
      console.log(`  Status:         Soft-Deleted at ${sourceUser.deletedAt}`);
    } else if (sourceUser.isDeactivated) {
      console.log(`  Status:         Deactivated`);
    } else {
      console.log(`  Status:         Active`);
    }

    console.log("\n📂 TARGET ACCOUNT (Will receive all data & remain active):");
    console.log(`  ID:             ${targetUser.id}`);
    console.log(`  Name:           ${targetUser.name}`);
    console.log(`  Email:          ${targetUser.email}`);
    console.log(`  Phone:          ${targetUser.phone}`);
    console.log(`  Role:           ${targetUser.role} (Roles: ${JSON.stringify(targetUser.roles || [])})`);
    console.log(`  Wallet Balance: KES ${parseFloat(targetStats.walletBalance).toFixed(2)}`);
    console.log(`  Orders Count:   ${targetStats.orders}`);
    console.log(`  Products Count: ${targetStats.products}`);
    console.log(`  FastFood Count: ${targetStats.fastFood}`);
    console.log("------------------------------------------------------------");

    if (!execute) {
      console.log(`
✨ DRY RUN COMPLETE. No database changes were made.
To execute this merge, re-run the command adding the --execute flag:

  node merge_accounts.js ${sourceId} ${targetId} --execute
`);
      process.exit(0);
    }

    console.log(`⚡ Executing account merge...`);
    const transaction = await sequelize.transaction();

    try {
      // 1. Transfer Orders
      const [ordersUpdated] = await Order.update(
        { userId: targetUser.id },
        { where: { userId: sourceUser.id }, transaction }
      );
      console.log(`✅ Transferred ${ordersUpdated} orders.`);

      // 2. Transfer Products/FastFood
      const [productsUpdated] = await Product.update(
        { sellerId: targetUser.id },
        { where: { sellerId: sourceUser.id }, transaction }
      );
      const [fastFoodUpdated] = await FastFood.update(
        { vendor: targetUser.id },
        { where: { vendor: sourceUser.id }, transaction }
      );
      console.log(`✅ Transferred ${productsUpdated} products.`);
      console.log(`✅ Transferred ${fastFoodUpdated} fast food items.`);

      // 3. Transfer Wallet Balance
      const sourceWallet = await Wallet.findOne({ where: { userId: sourceUser.id }, transaction });
      let targetWallet = await Wallet.findOne({ where: { userId: targetUser.id }, transaction });

      if (sourceWallet && parseFloat(sourceWallet.balance) > 0) {
        const transferAmt = parseFloat(sourceWallet.balance);
        if (!targetWallet) {
          targetWallet = await Wallet.create({ userId: targetUser.id, balance: transferAmt }, { transaction });
        } else {
          targetWallet.balance = parseFloat(targetWallet.balance) + transferAmt;
          await targetWallet.save({ transaction });
        }
        sourceWallet.balance = 0;
        await sourceWallet.save({ transaction });
        console.log(`✅ Merged Wallet table balances (Transferred KES ${transferAmt.toFixed(2)}).`);
      }

      // Sync walletBalance directly on User models
      const sUser = await User.findByPk(sourceUser.id, { transaction });
      const tUser = await User.findByPk(targetUser.id, { transaction });

      if (parseFloat(sUser.walletBalance || 0) > 0) {
        const userWalletTransfer = parseFloat(sUser.walletBalance);
        tUser.walletBalance = parseFloat(tUser.walletBalance || 0) + userWalletTransfer;
        sUser.walletBalance = 0;
        console.log(`✅ Merged User model walletBalance (Transferred KES ${userWalletTransfer.toFixed(2)}).`);
      }

      // 4. Resolve Placeholders
      const isPlaceholderEmail = (email) => {
        if (!email) return true;
        const em = String(email).trim().toLowerCase();
        return em.startsWith('noemail_') || 
               em.endsWith('@placeholder.local') || 
               em.endsWith('@comrades360.placeholder') ||
               em.includes('placeholder');
      };

      const isPlaceholderPhone = (phone) => {
        if (!phone) return true;
        const ph = String(phone).trim().toLowerCase();
        return ph.startsWith('nophone_') || 
               ph.startsWith('placeholder-') ||
               ph.includes('placeholder');
      };

      const isPlaceholderName = (name) => {
        if (!name) return true;
        const nm = String(name).trim();
        return /^User\d{0,4}$/i.test(nm) || nm.toLowerCase() === 'new user';
      };

      // If target has placeholder details, but source has real details, update target in memory
      if (isPlaceholderEmail(tUser.email) && !isPlaceholderEmail(sUser.email)) {
        tUser.email = sUser.email;
        tUser.emailVerified = sUser.emailVerified;
        console.log(`✅ Target user email updated from placeholder to real: ${tUser.email}`);
      }

      if (isPlaceholderPhone(tUser.phone) && !isPlaceholderPhone(sUser.phone)) {
        tUser.phone = sUser.phone;
        tUser.phoneVerified = sUser.phoneVerified;
        console.log(`✅ Target user phone updated from placeholder to real: ${tUser.phone}`);
      }

      if (isPlaceholderName(tUser.name) && !isPlaceholderName(sUser.name)) {
        tUser.name = sUser.name;
        console.log(`✅ Target user name updated from placeholder to real: ${tUser.name}`);
      }

      // 5. Merge Roles
      let sourceRoles = Array.isArray(sUser.roles) ? sUser.roles : [];
      let targetRoles = Array.isArray(tUser.roles) ? tUser.roles : [];
      const mergedRoles = [...new Set([...targetRoles, ...sourceRoles])];
      
      let mainRole = tUser.role;
      const rolePriority = ['superadmin', 'admin', 'logistics_manager', 'finance_manager', 'ops_manager', 'seller', 'marketer', 'delivery_agent', 'customer'];
      for (const role of rolePriority) {
        if (mergedRoles.includes(role)) {
          mainRole = role;
          break;
        }
      }

      tUser.roles = mergedRoles;
      tUser.role = mainRole;

      // 6. Free up email/phone first on the source user to avoid unique constraints when saving target
      const timestamp = Date.now();
      const originalSourceEmail = sUser.email;
      const originalSourcePhone = sUser.phone;

      sUser.email = `merged_${timestamp}_${originalSourceEmail}`;
      sUser.phone = `merged_${timestamp}_${originalSourcePhone}`;
      sUser.isDeactivated = true;
      sUser.isFrozen = true;
      await sUser.save({ transaction });

      // 7. Save Target User now that the email/phone has been freed
      await tUser.save({ transaction });
      console.log(`✅ Target user updated with merged roles and data.`);

      // Soft delete source
      await sUser.destroy({ transaction });
      console.log(`✅ Source user soft-deleted and email/phone freed up.`);

      // Commit transaction
      await transaction.commit();
      console.log("------------------------------------------------------------");
      console.log("🎉 SUCCESS: Accounts merged successfully!");
      console.log(`Merged Source Account ID ${sourceUser.id} into Target Account ID ${targetUser.id}.`);
      console.log("------------------------------------------------------------");
      process.exit(0);

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    console.error("❌ Error running merge operation:", error);
    process.exit(1);
  }
}

main();
