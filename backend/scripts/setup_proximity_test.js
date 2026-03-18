const { User, DeliveryAgentProfile } = require('../models');

/**
 * PROXIMITY TEST CASE SETUP
 * Sets up:
 * 1. A Seller at "Jomo Kenyatta University (JKUAT), Juja"
 * 2. The current Delivery Agent at "Juja City Mall" (~1.8km away)
 */
async function setupTest() {
    console.log('--- Setting up Proximity Test Case ---');
    
    try {
        // 1. Find a seller to use for the test
        const seller = await User.findOne({ where: { role: 'seller' } });
        if (!seller) throw new Error('No seller found in DB');

        // Set seller to JKUAT Juja
        await seller.update({
            name: "TEST SELLER (JKUAT)",
            businessAddress: "JKUAT Main Campus",
            businessTown: "Juja",
            businessCounty: "Kiambu",
            businessLat: -1.0967,
            businessLng: 37.0125
        });
        console.log(`✅ Updated seller ${seller.name} to JKUAT, Juja`);

        // 2. Find a delivery agent (or the current user if role is delivery_agent)
        const agent = await User.findOne({ where: { role: 'delivery_agent' } });
        if (!agent) throw new Error('No delivery agent found in DB');

        const profile = await DeliveryAgentProfile.findOne({ where: { userId: agent.id } });
        if (!profile) throw new Error('No delivery profile found for agent');

        // Set agent to Juja City Mall (approx 1.8km from JKUAT)
        const agentLoc = {
            lat: -1.1086,
            lng: 37.0142,
            timestamp: new Date().toISOString()
        };

        await profile.update({
            currentLocation: JSON.stringify(agentLoc)
        });
        console.log(`✅ Updated agent ${agent.name} to Juja City Mall`);
        console.log(`\n--- Setup Complete ---`);
        console.log(`Test Goal: Check "Available Orders" for this agent.`);
        console.log(`Expected Result: Orders from "${seller.name}" should show approx "1.4km - 1.8km away".`);
        
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setupTest();
