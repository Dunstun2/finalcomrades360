const { sequelize, Subscription } = require('../database/models.registry');

async function checkCostSnapshot(subscriptionId) {
  try {
    const sub = await Subscription.findByPk(subscriptionId);
    
    if (!sub) {
      console.error(`❌ Subscription ${subscriptionId} not found`);
      return;
    }

    console.log(`\n📊 Subscription #${subscriptionId}`);
    console.log(`  Plan ID: ${sub.planId}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Has Snapshot: ${!!sub.costProjectionSnapshot}`);
    
    if (sub.costProjectionSnapshot) {
      const snapshot = sub.costProjectionSnapshot;
      console.log('\n💾 Cost Projection Snapshot:');
      console.log(`  Generated At: ${snapshot.generatedAt}`);
      console.log(`  Billing Cycle: ${snapshot.billingCycle}`);
      console.log(`  Total Rows: ${snapshot.rows?.length || 0}`);
      
      if (snapshot.rows) {
        console.log('\n📋 Rows:');
        snapshot.rows.forEach((row, idx) => {
          console.log(`\n  Row ${idx + 1}: ${row.schedule}`);
          console.log(`    Base Food: KES ${row.baseFoodCost}`);
          console.log(`    Base Delivery: KES ${row.baseDeliveryFee}`);
          console.log(`    Benefits: ${row.benefitsApplied?.join(', ') || 'None'}`);
          console.log(`    Final Total: KES ${row.finalTotal}`);
        });
      }
      
      if (snapshot.benefitsApplied) {
        console.log('\n💎 Benefits Summary:');
        console.log(JSON.stringify(snapshot.benefitsApplied, null, 2));
      }
    } else {
      console.log('\n⚠️ No cost projection snapshot found');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

const subId = process.argv[2] || 1;
checkCostSnapshot(parseInt(subId));
