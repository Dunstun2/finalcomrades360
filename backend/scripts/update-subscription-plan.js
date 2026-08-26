const { sequelize, Subscription } = require('../database/models.registry');

async function updateSubscriptionPlan(subscriptionId, planId) {
  try {
    const sub = await Subscription.findByPk(subscriptionId);
    
    if (!sub) {
      console.error(`❌ Subscription ${subscriptionId} not found`);
      return;
    }

    console.log(`\n🔄 Updating subscription #${subscriptionId} to use plan #${planId}`);
    
    await sub.update({ planId });
    
    console.log('✅ Subscription updated successfully!');
    console.log(`   Plan ID: ${sub.planId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

const subId = process.argv[2];
const planId = process.argv[3];

if (!subId || !planId) {
  console.error('Usage: node update-subscription-plan.js <subscriptionId> <planId>');
  console.error('Example: node update-subscription-plan.js 1 9');
  process.exit(1);
}

updateSubscriptionPlan(parseInt(subId), parseInt(planId));
