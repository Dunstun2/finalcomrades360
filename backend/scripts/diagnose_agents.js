const path = require('path');
const { sequelize } = require(path.resolve(__dirname, '..', 'database', 'database'));
const models = require(path.resolve(__dirname, '..', 'models'));
const User = models.User;
const DeliveryAgentProfile = models.DeliveryAgentProfile;

async function diagnoseAgents() {
  console.log('🔍 Starting Delivery Agent Diagnostic Scan...\n');
  try {
    // 1. Fetch all users who have the role of delivery agent
    const agents = await User.findAll({
      where: { role: 'delivery_agent' },
      include: [{ model: DeliveryAgentProfile, as: 'deliveryProfile' }],
      paranoid: false // Include soft-deleted users
    });

    console.log(`📊 Found ${agents.length} delivery agents registered in the database.\n`);

    if (agents.length === 0) {
      console.log('❌ ERROR: No users with role = "delivery_agent" exist in the User table.');
      console.log('👉 RECOMMENDATION: Ensure you have assigned the "delivery_agent" role to the users in the admin panel or database.');
      process.exit(0);
    }

    const { checkProfileCompleteness, isAgentAvailableNow } = require('../utils/deliveryUtils');

    agents.forEach((agent, i) => {
      console.log(`--------------------------------------------------`);
      console.log(`👤 Agent #${i + 1}: ${agent.name} (ID: ${agent.id})`);
      console.log(`   - Email: ${agent.email}`);
      console.log(`   - Phone: ${agent.phone}`);
      console.log(`   - Soft Deleted? ${agent.deletedAt ? '❌ YES (' + agent.deletedAt + ')' : '✅ No'}`);
      console.log(`   - Account Deactivated? ${agent.isDeactivated ? '❌ YES' : '✅ No'}`);
      console.log(`   - Account Frozen? ${agent.isFrozen ? '❌ YES' : '✅ No'}`);
      
      // Suspend checks
      const isSuspended = agent.isDeliverySuspended || (agent.suspendedRoles && agent.suspendedRoles.includes('delivery_agent'));
      console.log(`   - Role Suspended? ${isSuspended ? '❌ YES' : '✅ No'}`);

      const profile = agent.deliveryProfile;
      if (!profile) {
        console.log(`   - Profile: ❌ MISSING! (No entry in DeliveryAgentProfile table)`);
        console.log(`     👉 RECOMMENDATION: Log in as this agent and go to their settings to initialize their profile, or create an entry in the DeliveryAgentProfile table.`);
      } else {
        console.log(`   - Profile: ✅ Created`);
        console.log(`     * Profile Active (isActive)? ${profile.isActive ? '✅ YES' : '❌ NO'}`);
        console.log(`     * Profile Status: "${profile.status}"`);
        console.log(`     * Vehicle Type: "${profile.vehicleType || 'Not Set'}"`);
        console.log(`     * Current Location: "${profile.currentLocation || 'Not Set'}"`);
        
        const { isComplete, missing } = checkProfileCompleteness(profile, agent);
        console.log(`     * Profile Complete for Duty? ${isComplete ? '✅ YES' : '❌ NO'}`);
        if (!isComplete) {
          console.log(`       ⚠️ Missing fields: ${missing.join(', ')}`);
        }

        const isAvailable = isAgentAvailableNow(profile);
        console.log(`     * Shift Active (isAvailable)? ${isAvailable ? '✅ YES' : '❌ NO'}`);
      }
    });

    console.log(`\n==================================================`);
    console.log(`💡 DIAGNOSTIC SUMMARY & TROUBLESHOOTING`);
    console.log(`==================================================`);
    
    const activeAgents = agents.filter(a => {
      if (a.deletedAt || a.isDeactivated || a.isFrozen) return false;
      const isSuspended = a.isDeliverySuspended || (a.suspendedRoles && a.suspendedRoles.includes('delivery_agent'));
      if (isSuspended) return false;
      if (!a.deliveryProfile) return false;
      return true;
    });

    console.log(`- Total Accounts: ${agents.length}`);
    console.log(`- Active Accounts (not deactivated/suspended): ${activeAgents.length}`);
    
    if (activeAgents.length === 0) {
      console.log('\n🚨 CRITICAL FINDING: All registered agents have either deactivated accounts, missing profiles, or are suspended.');
    } else {
      console.log('\n🟢 PASSING FINDING: You have active agents in the database, but make sure they:');
      console.log('   1. Toggle their availability to "Active" inside their delivery agent app/dashboard.');
      console.log('   2. Set their "currentLocation" and "vehicleType" to meet profile completeness.');
    }

  } catch (err) {
    console.error('💥 Diagnostic Crash:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

diagnoseAgents();
