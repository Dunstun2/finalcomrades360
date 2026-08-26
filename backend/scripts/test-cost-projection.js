const { sequelize, Plan, BenefitPackage, PackageBenefit, Feature, FastFood } = require('../database/models.registry');
const { generateCostProjection } = require('../modules/subscriptions/utils/costProjectionCalculator');

async function testCostProjection() {
  try {
    console.log('\n=== TESTING COST PROJECTION ===\n');

    // Find the Meal Pro package
    const pkg = await BenefitPackage.findOne({
      where: { name: 'Meal Pro' },
      include: [{
        model: PackageBenefit,
        as: 'benefits',
        include: [{ model: Feature, as: 'feature' }]
      }]
    });

    if (!pkg) {
      console.error('❌ Meal Pro package not found');
      return;
    }

    console.log('📦 Package:', pkg.name);
    console.log('\n💎 Benefits:');
    pkg.benefits.forEach(b => {
      console.log(`  - ${b.featureCode}:`, b.value);
    });

    // Create sample schedule with high value order
    const schedule = [
      {
        dayOfWeek: 'friday',
        preferredTime: '19:00',
        mealTimeType: 'dinner',
        fastFoodItemIds: [1, 2, 3, 4, 5, 6, 7] // Multiple items
      }
    ];

    // Get real food items
    const foodItems = await FastFood.findAll({
      where: { id: [1, 2, 3, 4, 5, 6, 7] },
      limit: 7
    });

    console.log('\n🍽️ Food Items:');
    foodItems.forEach(f => {
      console.log(`  - ${f.name}: KES ${f.basePrice || f.displayPrice}`);
    });

    const totalFood = foodItems.reduce((sum, f) => sum + parseFloat(f.basePrice || f.displayPrice || 0), 0);
    console.log(`\n💰 Total Food Cost: KES ${totalFood}`);
    console.log(`🎯 Should qualify for discount: ${totalFood >= 800 ? 'YES ✅' : 'NO ❌'}`);

    // Generate projection
    console.log('\n🔄 Generating cost projection...\n');
    const projection = await generateCostProjection(
      schedule,
      foodItems,
      pkg.benefits,
      'weekly'
    );

    if (projection) {
      console.log('\n📊 PROJECTION RESULTS:');
      console.log('Rows:', projection.rows.length);
      
      projection.rows.forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`);
        console.log(`  Schedule: ${row.schedule}`);
        console.log(`  Base Food: KES ${row.baseFoodCost}`);
        console.log(`  Base Delivery: KES ${row.baseDeliveryFee}`);
        console.log(`  Benefits Applied: ${row.benefitsApplied.join(', ')}`);
        console.log(`  Final Food: KES ${row.finalFoodCost}`);
        console.log(`  Final Delivery: KES ${row.finalDeliveryFee}`);
        console.log(`  Final Total: KES ${row.finalTotal}`);
      });

      console.log('\n💡 Totals:');
      console.log(`  Raw Total: KES ${projection.totals.rawTotal}`);
      console.log(`  Final Total: KES ${projection.totals.finalTotal}`);
      console.log(`  Savings: KES ${projection.totals.totalSavings}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testCostProjection();
