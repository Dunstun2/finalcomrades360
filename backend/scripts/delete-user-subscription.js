const { sequelize, User, Subscription, Plan, MealSchedule, MealOccurrence, SubscriptionUsage, SubscriptionInvoice, SubscriptionEvent } = require('../database/models.registry');

async function deleteUserSubscription(userEmail) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);
    
    // Find the user by email
    const user = await User.findOne({
      where: { email: userEmail },
      transaction
    });
    
    if (!user) {
      console.log(`❌ User with email ${userEmail} not found`);
      await transaction.rollback();
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
    
    // Find all active subscriptions for this user
    const activeStatuses = ['Trial', 'Active', 'Grace', 'Past Due', 'Pending'];
    const subscriptions = await Subscription.findAll({
      where: {
        userId: user.id,
        status: activeStatuses
      },
      include: [
        { model: Plan, as: 'plan', required: false }
      ],
      transaction
    });
    
    if (subscriptions.length === 0) {
      console.log(`ℹ️  No active subscriptions found for user ${userEmail}`);
      await transaction.rollback();
      return;
    }
    
    console.log(`🎯 Found ${subscriptions.length} active subscription(s) to delete:`);
    subscriptions.forEach(sub => {
      console.log(`   - Subscription ID: ${sub.id}, Status: ${sub.status}, Plan: ${sub.plan?.name || 'Custom Plan'}`);
    });
    
    // Delete related data for each subscription
    for (const subscription of subscriptions) {
      const subId = subscription.id;
      console.log(`🗑️  Deleting data for subscription ${subId}...`);
      
      // Delete meal occurrences
      const occurrences = await MealOccurrence.destroy({
        where: { subscriptionId: subId },
        transaction
      });
      console.log(`   ✅ Deleted ${occurrences} meal occurrences`);
      
      // Delete meal schedules
      const schedules = await MealSchedule.destroy({
        where: { subscriptionId: subId },
        transaction
      });
      console.log(`   ✅ Deleted ${schedules} meal schedules`);
      
      // Delete subscription usage records
      const usages = await SubscriptionUsage.destroy({
        where: { subscriptionId: subId },
        transaction
      });
      console.log(`   ✅ Deleted ${usages} subscription usage records`);
      
      // Delete subscription invoices
      const invoices = await SubscriptionInvoice.destroy({
        where: { subscriptionId: subId },
        transaction
      });
      console.log(`   ✅ Deleted ${invoices} subscription invoices`);
      
      // Delete subscription events
      const events = await SubscriptionEvent.destroy({
        where: { subscriptionId: subId },
        transaction
      });
      console.log(`   ✅ Deleted ${events} subscription events`);
      
      // Finally delete the subscription itself
      await subscription.destroy({ transaction });
      console.log(`   ✅ Deleted subscription ${subId}`);
    }
    
    await transaction.commit();
    console.log(`🎉 Successfully deleted all active subscriptions for ${userEmail}`);
    
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error deleting subscriptions:`, error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
const userEmail = process.argv[2] || 'mej633852@gmail.com';

console.log(`🚀 Starting subscription deletion for user: ${userEmail}`);
console.log(`⚠️  WARNING: This will permanently delete all active meal subscriptions for this user!`);
console.log(`⏳ Processing...`);

deleteUserSubscription(userEmail)
  .then(() => {
    console.log(`✨ Script completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 Script failed:`, error);
    process.exit(1);
  });