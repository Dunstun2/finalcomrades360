const { Op } = require('sequelize');
const { sequelize, Order, User } = require('../models');

const APPLY_MODE = process.argv.includes('--apply');

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

function getPhoneVariants(phone) {
  if (!phone || typeof phone !== 'string') return [];

  const raw = phone.trim();
  if (!raw) return [];

  const digits = raw.replace(/\D/g, '');
  const variants = new Set([raw]);

  if (digits) variants.add(digits);

  // Common KE transforms: 07xxxxxxxx <-> 2547xxxxxxxx <-> +2547xxxxxxxx
  if (digits.length === 10 && digits.startsWith('0')) {
    const core = digits.slice(1);
    variants.add(`254${core}`);
    variants.add(`+254${core}`);
  }

  if (digits.length === 12 && digits.startsWith('254')) {
    const core = digits.slice(3);
    variants.add(`0${core}`);
    variants.add(`+254${core}`);
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    variants.add(`0${digits}`);
    variants.add(`254${digits}`);
    variants.add(`+254${digits}`);
  }

  return [...variants].filter(Boolean);
}

function isLikelyMarketer(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'marketer') return true;

  if (Array.isArray(user.roles)) {
    return user.roles.some(r => String(r || '').toLowerCase() === 'marketer');
  }

  return false;
}

async function findCustomerForOrder(order, transaction) {
  const normalizedEmail = normalizeEmail(order.customerEmail);
  if (normalizedEmail) {
    const byEmail = await User.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalizedEmail
      ),
      attributes: ['id', 'name', 'email', 'phone', 'role', 'roles'],
      transaction
    });

    if (byEmail) return byEmail;
  }

  const phoneVariants = getPhoneVariants(order.customerPhone);
  if (phoneVariants.length > 0) {
    const byPhone = await User.findOne({
      where: {
        phone: { [Op.in]: phoneVariants }
      },
      attributes: ['id', 'name', 'email', 'phone', 'role', 'roles'],
      transaction
    });

    if (byPhone) return byPhone;
  }

  return null;
}

async function backfillMarketingOrders() {
  const mode = APPLY_MODE ? 'APPLY' : 'DRY-RUN';
  console.log(`\n=== Backfill Marketing Orders (${mode}) ===`);

  const tx = await sequelize.transaction();

  try {
    const marketingOrders = await Order.findAll({
      where: { isMarketingOrder: true },
      attributes: [
        'id',
        'orderNumber',
        'userId',
        'marketerId',
        'customerName',
        'customerEmail',
        'customerPhone',
        'isMarketingOrder',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      transaction: tx
    });

    console.log(`Found ${marketingOrders.length} marketing order(s).`);

    let updatedCount = 0;
    let skippedNoCustomerMatch = 0;
    let skippedAlreadyCorrect = 0;
    let skippedAmbiguous = 0;

    for (const order of marketingOrders) {
      const customer = await findCustomerForOrder(order, tx);

      if (!customer) {
        skippedNoCustomerMatch++;
        continue;
      }

      let inferredMarketerId = order.marketerId;

      if (!inferredMarketerId) {
        const currentOwner = await User.findByPk(order.userId, {
          attributes: ['id', 'role', 'roles'],
          transaction: tx
        });

        if (isLikelyMarketer(currentOwner)) {
          inferredMarketerId = currentOwner.id;
        }
      }

      if (inferredMarketerId && customer.id === inferredMarketerId) {
        // Customer match points to marketer account; avoid corrupting ownership.
        skippedAmbiguous++;
        continue;
      }

      const updates = {};
      if (order.userId !== customer.id) {
        updates.userId = customer.id;
      }

      if (!order.marketerId && inferredMarketerId && inferredMarketerId !== customer.id) {
        updates.marketerId = inferredMarketerId;
      }

      if (Object.keys(updates).length === 0) {
        skippedAlreadyCorrect++;
        continue;
      }

      if (APPLY_MODE) {
        await order.update(updates, { transaction: tx });
      }

      updatedCount++;
      console.log(
        `[${APPLY_MODE ? 'UPDATED' : 'WOULD UPDATE'}] #${order.id} (${order.orderNumber}) ` +
        `userId ${order.userId} -> ${updates.userId ?? order.userId}` +
        `${updates.marketerId ? `, marketerId ${order.marketerId} -> ${updates.marketerId}` : ''}`
      );
    }

    if (APPLY_MODE) {
      await tx.commit();
      console.log('\nChanges committed.');
    } else {
      await tx.rollback();
      console.log('\nDry-run complete. No changes were written.');
    }

    console.log('\nSummary:');
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Skipped (already correct): ${skippedAlreadyCorrect}`);
    console.log(`- Skipped (no customer match): ${skippedNoCustomerMatch}`);
    console.log(`- Skipped (ambiguous): ${skippedAmbiguous}`);
  } catch (error) {
    await tx.rollback();
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

backfillMarketingOrders();
