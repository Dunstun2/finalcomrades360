const { sequelize, Subscription, MealSchedule, FastFood, Plan, PackageBenefit, Feature } = require('../database/models.registry');
const { generateCostProjection } = require('../modules/subscriptions/utils/costProjectionCalculator');

async function regenerateCostProjection(subscriptionId) {
  try {
    const sub = await Subscription.findByPk(subscriptionId, {
      include: [{
        model: Plan,
        as: 'plan'
      }]
    });

    if (!sub) {
      console.error(`❌ Subscription ${subscriptionId} not found`);
      return;
    }

    console.log(`\n🔄 Regenerating cost projection for subscription #${subscriptionId}`);

    // Get meal schedule
    const schedule = await MealSchedule.findAll({
      where: { subscriptionId }
    });

    if (schedule.length === 0) {
      console.error('❌ No schedule found for this subscription');
      return;
    }

    console.log(`📅 Found ${schedule.length} schedule entries`);

    // Get food items
    const foodIds = new Set();
    schedule.forEach(entry => {
      if (entry.preferredFastFoodItemId) {
        foodIds.add(entry.preferredFastFoodItemId);
      }
    });

    const foodItems = await FastFood.findAll({
      where: { id: Array.from(foodIds) }
    });

    console.log(`🍽️ Found ${foodItems.length} food items`);

    // Get benefits
    let benefits = [];
    if (sub.plan?.benefitPackageId) {
      benefits = await PackageBenefit.findAll({
        where: { packageId: sub.plan.benefitPackageId },
        include: [{ model: Feature, as: 'feature' }]
      });
    }

    console.log(`💎 Found ${benefits.length} benefits`);

    // Convert schedule to proper format
    const scheduleFormatted = schedule.map(s => ({
      dayOfWeek: s.dayOfWeek,
      preferredTime: s.preferredTime,
      mealTimeType: s.mealTimeType,
      preferredFastFoodItemId: s.preferredFastFoodItemId
    }));

    // Generate new projection
    const projection = await generateCostProjection(
      scheduleFormatted,
      foodItems,
      benefits,
      sub.plan?.billingCycle || sub.billingCycle || 'weekly'
    );

    if (projection) {
      await sub.update({ costProjectionSnapshot: projection });
      console.log('\n✅ Cost projection regenerated successfully!');
      
      console.log('\n📊 New Projection Summary:');
      console.log(`  Raw Total: KES ${projection.totals.rawTotal}`);
      console.log(`  Final Total: KES ${projection.totals.finalTotal}`);
      console.log(`  Total Savings: KES ${projection.totals.totalSavings}`);
      
      console.log('\n📋 Rows with benefits:');
      projection.rows.forEach((row, idx) => {
        if (row.benefitsApplied && !row.benefitsApplied.includes('None')) {
          console.log(`  Row ${idx + 1}: ${row.schedule}`);
          console.log(`    Base: KES ${row.baseFoodCost}`);
          console.log(`    Benefits: ${row.benefitsApplied.join(', ')}`);
          console.log(`    Final: KES ${row.finalTotal}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Get subscription ID from command line
const subId = process.argv[2];

if (!subId) {
  console.error('Usage: node regenerate-cost-projection.js <subscriptionId | all>');
  process.exit(1);
}

if (subId.toLowerCase() === 'all') {
  (async () => {
    try {
      const subs = await Subscription.findAll({
        include: [{ model: Plan, as: 'plan' }],
        where: { costProjectionSnapshot: null }
      });
      console.log(`Found ${subs.length} subscriptions needing backfill`);
      for (const sub of subs) {
        if (sub.plan?.type === 'meal') {
          await regenerateCostProjection(sub.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      await sequelize.close();
    }
  })();
} else {
  (async () => {
    try {
      await regenerateCostProjection(parseInt(subId));
    } finally {
      await sequelize.close();
    }
  })();
}
