const { User, DeliveryAgentProfile, Order } = require('../models');

async function setupScaledMasterScenario() {
    console.log('--- Scaling Master Scenario to ALL Existing Users ---');
    
    try {
        const locations = [
            { town: "Juja", lat: -1.1026, lng: 37.0131, county: "Kiambu" },
            { town: "Ruiru", lat: -1.1481, lng: 36.9606, county: "Kiambu" },
            { town: "Thika", lat: -1.0333, lng: 37.0667, county: "Kiambu" },
            { town: "Nairobi", lat: -1.2921, lng: 36.8219, county: "Nairobi" },
            { town: "Kasarani", lat: -1.2197, lng: 36.8967, county: "Nairobi" },
            { town: "Westlands", lat: -1.2675, lng: 36.8080, county: "Nairobi" },
            { town: "Kiambu Town", lat: -1.1714, lng: 36.8356, county: "Kiambu" }
        ];

        // 1. Distribute all Agents
        const agents = await User.findAll({ where: { role: 'delivery_agent' } });
        console.log(`Distributing ${agents.length} agents...`);
        for (let i = 0; i < agents.length; i++) {
            const loc = locations[i % locations.length];
            const profile = await DeliveryAgentProfile.findOne({ where: { userId: agents[i].id } });
            if (profile) {
                await profile.update({
                    currentLocation: JSON.stringify({
                        lat: loc.lat + (Math.random() - 0.5) * 0.01,
                        lng: loc.lng + (Math.random() - 0.5) * 0.01,
                        timestamp: new Date().toISOString()
                    }),
                    location: `${loc.town}, ${loc.county}`,
                    isActive: true
                });
            }
        }

        // 2. Distribute all Sellers
        const sellers = await User.findAll({ where: { role: 'seller' } });
        console.log(`Distributing ${sellers.length} sellers...`);
        for (let i = 0; i < sellers.length; i++) {
            const loc = locations[i % locations.length];
            await sellers[i].update({
                businessTown: loc.town,
                businessCounty: loc.county,
                businessLat: loc.lat + (Math.random() - 0.5) * 0.02,
                businessLng: loc.lng + (Math.random() - 0.5) * 0.02,
                businessAddress: `${loc.town} Industrial Area, Plot ${i+100}`
            });
        }

        // 3. Distribute all Customers
        const customers = await User.findAll({ where: { role: 'customer' } });
        console.log(`Distributing ${customers.length} customers...`);
        for (let i = 0; i < customers.length; i++) {
            const loc = locations[i % locations.length];
            await customers[i].update({
                town: loc.town,
                county: loc.county,
                houseNumber: `H-${i+10}`,
                estate: `${loc.town} Estate Phase ${Math.floor(i/5)+1}`
            });
        }

        // 4. Create realistic Orders connecting them
        console.log('Creating unique test orders for each seller...');
        for (let i = 0; i < sellers.length; i++) {
            const customer = customers[i % customers.length];
            const orderNum = `SCALED-TEST-${1000 + i}`;
            
            // Generate some random coordinates near the customer's town
            const loc = locations.find(l => l.town === customer.town) || locations[0];
            const dLat = loc.lat + (Math.random() - 0.5) * 0.01;
            const dLng = loc.lng + (Math.random() - 0.5) * 0.01;

            const [order, created] = await Order.findOrCreate({
                where: { orderNumber: orderNum },
                defaults: {
                    userId: customer.id,
                    sellerId: sellers[i].id,
                    total: 500 + Math.floor(Math.random() * 5000),
                    status: 'order_placed',
                    paymentMethod: 'mpesa',
                    items: 1 + Math.floor(Math.random() * 5),
                    deliveryType: 'seller_to_customer',
                    deliveryLat: dLat,
                    deliveryLng: dLng,
                    deliveryAddress: `${customer.houseNumber}, ${customer.estate}, ${customer.town}`
                }
            });

            if (!created) {
                await order.update({
                    userId: customer.id,
                    sellerId: sellers[i].id,
                    status: 'order_placed',
                    deliveryAgentId: null,
                    deliveryLat: dLat,
                    deliveryLng: dLng
                });
            }
        }

        console.log(`\n--- Scaled Scenario Complete ---`);
        console.log(`- Distributed ${agents.length} agents across the registry.`);
        console.log(`- Distributed ${sellers.length} sellers with GPS coordinates.`);
        console.log(`- Distributed ${customers.length} customers across towns.`);
        console.log(`- Created ${sellers.length} active orders for proximity testing.`);
        
        process.exit(0);
    } catch (err) {
        console.error('Scaled Setup failed:', err);
        process.exit(1);
    }
}

setupScaledMasterScenario();
