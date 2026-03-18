const { User } = require('../models');
const { geocodeAddress } = require('../utils/geocodingUtils');

async function backfill() {
    console.log('--- Starting Seller Geodata Backfill ---');
    
    try {
        const sellers = await User.findAll({
            where: {
                role: 'seller',
                businessLat: null
            }
        });

        console.log(`Found ${sellers.length} sellers missing coordinates.`);

        for (const seller of sellers) {
            console.log(`Processing: ${seller.name} (${seller.businessTown || 'No Town'})`);
            
            const coords = await geocodeAddress(seller.businessAddress, seller.businessTown, seller.businessCounty);
            
            if (coords) {
                await seller.update({
                    businessLat: coords.lat,
                    businessLng: coords.lng
                });
                console.log(`✅ Updated ${seller.name} to [${coords.lat}, ${coords.lng}]`);
            } else {
                console.log(`❌ Could not resolve address for ${seller.name}`);
            }

            // Respect rate limit
            await new Promise(resolve => setTimeout(resolve, 1100));
        }

        console.log('--- Backfill Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Backfill failed:', err);
        process.exit(1);
    }
}

backfill();
