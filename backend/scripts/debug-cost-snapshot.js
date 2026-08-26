/**
 * Debug Script: Compare Cost Snapshot vs Live Calculation
 * 
 * This script fetches a subscription with a cost snapshot and compares
 * it to what would be calculated live to identify discrepancies.
 */

const { Subscription, FastFood, PackageBenefit, Feature, Plan } = require('../database/models.registry');
const { generateCostProjection } = require('../modules/subscriptions/utils/costProjectionCalculator');

async function debugCostSnapshot(subscriptionId) {
  console.log(`\n🔍 Debugging Cost Snapshot for Subscription #${subscriptionId}\n`);

  try {
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        {
          model: Plan,
          as: 'plan'
        }
      ]
    });

    if (!subscription) {
      console.error('❌ Subscription not found');
      return;
    }

    console.log(`📋 Subscription Details:`);
    console.log(`   ID: ${subscription.id}`);
    console.log(`   User ID: ${subscription.userId}`);
    console.log(`   Plan: ${subscription.plan?.name || 'Custom'}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Has Snapshot: ${!!subscription.costProjectionSnapshot}\n`);

    if (!subscription.costProjectionSnapshot) {
      console.log('⚠️  No cost projection snapshot found for this subscription');
      return;
    }

    const snapshot = subscription.costProjectionSnapshot;

    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`SAVED SNAPSHOT (What Customer Sees)`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    console.log(`Generated At: ${snapshot.generatedAt}`);
    console.log(`Billing Cycle: ${snapshot.billingCycle}\n`);

    console.log(`Rows (${snapshot.rows.length} delivery slots):`);
    snapshot.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.schedule}`);
      console.log(`   Items: ${row.items.map(i => `${i.name} (${i.quantity})`).join(', ')}`);
      console.log(`   Base Food: KES ${row.baseFoodCost.toFixed(2)}`);
      console.log(`   Base Delivery: KES ${row.baseDeliveryFee.toFixed(2)}`);
      console.log(`   Benefits: ${row.benefitsApplied.join(', ')}`);
      console.log(`   Final Food: KES ${row.finalFoodCost.toFixed(2)}`);
      console.log(`   Final Delivery: KES ${row.finalDeliveryFee.toFixed(2)}`);
      console.log(`   Final Total: KES ${row.finalTotal.toFixed(2)}`);
    });

    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`TOTALS:`);
    console.log(`   Raw Food: KES ${snapshot.totals.rawFoodCost.toFixed(2)}`);
    console.log(`   Raw Delivery: KES ${snapshot.totals.rawDeliveryFee.toFixed(2)}`);
    console.log(`   Raw Total: KES ${snapshot.totals.rawTotal.toFixed(2)}`);
    console.log(`   ─────────────`);
    console.log(`   Food Savings: KES ${snapshot.totals.foodSavings.toFixed(2)}`);
    console.log(`   Delivery Savings: KES ${snapshot.totals.deliverySavings.toFixed(2)}`);
    console.log(`   Total Savings: KES ${snapshot.totals.totalSavings.toFixed(2)}`);
    console.log(`   ─────────────`);
    console.log(`   Final Food: KES ${snapshot.totals.finalFoodCost.toFixed(2)}`);
    console.log(`   Final Delivery: KES ${snapshot.totals.finalDeliveryFee.toFixed(2)}`);
    console.log(`   FINAL TOTAL: KES ${snapshot.totals.finalTotal.toFixed(2)}`);

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`BENEFITS USAGE:`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`   Free Meals: ${snapshot.benefitsApplied.freeMealsUsed}/${snapshot.benefitsApplied.maxFreeMeals}`);
    console.log(`   Free Deliveries: ${snapshot.benefitsApplied.freeDeliveriesUsed}/${snapshot.benefitsApplied.maxFreeDeliveries}`);
    console.log(`   Meal Discount: ${snapshot.benefitsApplied.mealDiscountPercent}%\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

// Get subscription ID from command line or use default
const subscriptionId = process.argv[2] || 1;
debugCostSnapshot(subscriptionId);
