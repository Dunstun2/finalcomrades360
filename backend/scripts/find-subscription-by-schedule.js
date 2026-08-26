const { sequelize, Subscription, MealSchedule, Plan } = require('../database/models.registry');

async function findSubscriptionBySchedule() {
  try {
    // Look for subscriptions with meals on Friday (2026-07-29 is a Friday)
    const schedules = await MealSchedule.findAll({
      where: {
        dayOfWeek: 'friday',
        preferredTime: '19:00'
      },
      include: [{
        model: Subscription,
        as: 'subscription',
        include: [{ model: Plan, as: 'plan' }]
      }]
    });

    console.log('\n=== SUBSCRIPTIONS WITH FRIDAY 19:00 MEALS ===\n');
    
    if (schedules.length === 0) {
      console.log('❌ No schedules found for Friday 19:00');
      
      // Try to find any subscriptions with schedules
      const allSchedules = await MealSchedule.findAll({
        include: [{
          model: Subscription,
          as: 'subscription',
          include: [{ model: Plan, as: 'plan' }]
        }],
        limit: 10
      });
      
      console.log('\n=== ALL SUBSCRIPTIONS WITH SCHEDULES ===\n');
      const subIds = new Set();
      allSchedules.forEach(s => {
        if (!subIds.has(s.subscriptionId)) {
          subIds.add(s.subscriptionId);
          console.log(`Subscription ID: ${s.subscriptionId}`);
          console.log(`  Plan: ${s.subscription?.plan?.name || 'Custom'}`);
          console.log(`  Schedule: ${s.dayOfWeek} ${s.preferredTime}`);
          console.log(`  Food ID: ${s.preferredFastFoodItemId}`);
          console.log('');
        }
      });
    } else {
      const subIds = new Set();
      schedules.forEach(s => {
        if (!subIds.has(s.subscriptionId)) {
          subIds.add(s.subscriptionId);
          console.log(`Subscription ID: ${s.subscriptionId}`);
          console.log(`  Plan: ${s.subscription?.plan?.name || 'Custom'}`);
          console.log(`  Plan ID: ${s.subscription?.planId || 'None'}`);
          console.log(`  Status: ${s.subscription?.status}`);
          console.log('');
        }
      });
    }

    // Also list all subscriptions
    const allSubs = await Subscription.findAll({
      include: [{ model: Plan, as: 'plan' }]
    });

    console.log('\n=== ALL SUBSCRIPTIONS ===\n');
    allSubs.forEach(sub => {
      console.log(`ID: ${sub.id}`);
      console.log(`  User ID: ${sub.userId}`);
      console.log(`  Plan: ${sub.plan?.name || 'Custom'}`);
      console.log(`  Plan ID: ${sub.planId || 'None'}`);
      console.log(`  Status: ${sub.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

findSubscriptionBySchedule();
