const { sequelize, Subscription, Plan, User } = require('../database/models.registry');

async function listSubscriptions() {
  try {
    const subs = await Subscription.findAll({
      include: [
        { model: Plan, as: 'plan', attributes: ['name', 'type'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    console.log('\n=== RECENT SUBSCRIPTIONS ===\n');
    
    subs.forEach(sub => {
      console.log(`ID: ${sub.id}`);
      console.log(`  User: ${sub.user?.name || sub.guestName || 'Unknown'} (ID: ${sub.userId || 'Guest'})`);
      console.log(`  Plan: ${sub.plan?.name || 'Custom'}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Billing Cycle: ${sub.billingCycle}`);
      console.log(`  Created: ${sub.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

listSubscriptions();
