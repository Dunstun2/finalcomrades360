/**
 * fix_orphaned_statuses.js
 * 
 * One-time database migration script to fix items that are approved
 * but have their `status` column stuck in 'draft', 'pending', or 'archived',
 * causing them to vanish from public-facing pages.
 *
 * Works in both development (SQLite) and production (MySQL).
 *
 * Usage (from project root):
 *   Development:  node backend/scripts/fix_orphaned_statuses.js
 *   Production:   NODE_ENV=production node backend/scripts/fix_orphaned_statuses.js
 *
 * On cPanel / shared hosting, SSH in and run:
 *   cd ~/public_html   (or wherever your app lives)
 *   NODE_ENV=production node backend/scripts/fix_orphaned_statuses.js
 */

const { Product, FastFood } = require('../models/index');

async function main() {
  console.log('=== Fix Orphaned Statuses ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // ── Products ──────────────────────────────────────────────
  const brokenProducts = await Product.findAll({
    where: {
      approved: true,
      reviewStatus: 'approved',
    },
    raw: true,
  });

  const productsToFix = brokenProducts.filter(p => p.status !== 'active');

  console.log(`Products: ${brokenProducts.length} approved total, ${productsToFix.length} have wrong status`);

  if (productsToFix.length > 0) {
    console.log('  Broken products:');
    productsToFix.forEach(p => {
      console.log(`    ID=${p.id} name="${p.name}" status="${p.status}" visibilityStatus="${p.visibilityStatus}"`);
    });

    const idsToFix = productsToFix.map(p => p.id);
    const [updatedCount] = await Product.update(
      { status: 'active', visibilityStatus: 'visible', isActive: true },
      { where: { id: idsToFix } }
    );
    console.log(`  ✅ Fixed ${updatedCount} products → status='active', visibilityStatus='visible'\n`);
  } else {
    console.log('  ✅ All approved products already have status="active"\n');
  }

  // ── FastFood ──────────────────────────────────────────────
  const brokenFastFoods = await FastFood.findAll({
    where: {
      approved: true,
      reviewStatus: 'approved',
    },
    raw: true,
  });

  const fastFoodsToFix = brokenFastFoods.filter(
    f => f.status !== 'approved' && f.status !== 'active'
  );

  console.log(`FastFood: ${brokenFastFoods.length} approved total, ${fastFoodsToFix.length} have wrong status`);

  if (fastFoodsToFix.length > 0) {
    console.log('  Broken fast foods:');
    fastFoodsToFix.forEach(f => {
      console.log(`    ID=${f.id} name="${f.name}" status="${f.status}"`);
    });

    const idsToFix = fastFoodsToFix.map(f => f.id);
    const [updatedCount] = await FastFood.update(
      { status: 'active', isActive: true },
      { where: { id: idsToFix } }
    );
    console.log(`  ✅ Fixed ${updatedCount} fast foods → status='active'\n`);
  } else {
    console.log('  ✅ All approved fast foods already have correct status\n');
  }

  // ── Cache Invalidation ────────────────────────────────────
  try {
    const cacheService = require('../scripts/services/cacheService');
    await cacheService.delPattern('products:*');
    await cacheService.delPattern('homepage:*');
    console.log('🗑️  Cache invalidated (products:* and homepage:*)');
  } catch (e) {
    console.log('ℹ️  Cache invalidation skipped (Redis may not be running):', e.message);
  }

  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
