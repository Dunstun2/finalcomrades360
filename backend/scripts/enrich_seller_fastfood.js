const { FastFood, User } = require('../models');

const DEFAULT_SCHEDULE = [
  { day: 'Monday', available: true, from: '08:00', to: '21:00' },
  { day: 'Tuesday', available: true, from: '08:00', to: '21:00' },
  { day: 'Wednesday', available: true, from: '08:00', to: '21:00' },
  { day: 'Thursday', available: true, from: '08:00', to: '21:00' },
  { day: 'Friday', available: true, from: '08:00', to: '21:00' },
  { day: 'Saturday', available: true, from: '08:00', to: '21:00' },
  { day: 'Sunday', available: true, from: '08:00', to: '21:00' },
  { day: 'All Days', available: true, from: '08:00', to: '21:00' }
];

async function enrich() {
    try {
        const email = 'dunstunwambutsi20@gmail.com';
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.error(`User ${email} not found.`);
            process.exit(1);
        }

        const items = await FastFood.findAll({ where: { vendor: user.id } });
        console.log(`Enriching ${items.length} items for ${email}...`);

        for (const item of items) {
            await item.update({
                kitchenVendor: "Dunstun's Gourmet Express",
                vendorLocation: "Student Center, Level 2 (near Main Wing)",
                vendorLat: -1.2921,
                vendorLng: 36.8219,
                shortDescription: item.shortDescription || item.description.substring(0, 100),
                estimatedServings: "1-2 persons",
                preparationTimeMinutes: item.preparationTimeMinutes || 20,
                deliveryTimeEstimateMinutes: item.deliveryTimeEstimateMinutes || 35,
                availabilityDays: DEFAULT_SCHEDULE,
                deliveryFeeType: "fixed",
                deliveryFee: 50,
                deliveryAreaLimits: ["Main Campus", "Hostels 1-10", "Library", "Science Block"],
                status: 'active',
                reviewStatus: 'approved',
                approved: true,
                isAvailable: true,
                isActive: true
            });
            console.log(`Updated: ${item.name}`);
        }

        console.log('Enrichment complete.');
        process.exit(0);
    } catch (error) {
        console.error('Enrichment failed:', error);
        process.exit(1);
    }
}

enrich();
