const { User, DeliveryAgentProfile } = require('../models');
const { Op } = require('sequelize');

async function findTrialUsers() {
  console.log('--- Detailed User Proximity Report ---');

  // 1. Sellers
  const sellers = await User.findAll({
    where: { role: 'seller', businessLat: { [Op.ne]: null } },
    attributes: ['email', 'name', 'businessTown', 'businessLat', 'businessLng']
  });

  // 2. Agents
  const agents = await DeliveryAgentProfile.findAll({
    include: [{ model: User, as: 'user', attributes: ['email', 'name'] }]
  });

  console.log('\n--- ACTIVE AGENTS ---');
  agents.forEach(a => {
    try {
      const loc = a.currentLocation ? JSON.parse(a.currentLocation) : null;
      console.log(`Agent: ${a.user?.name} (${a.user?.email})`);
      console.log(`  Profile Location: ${a.location}`);
      console.log(`  Current GPS: ${loc ? `${loc.lat}, ${loc.lng}` : 'NONE'}`);
      console.log(`  Max Dist: ${a.maxDeliveryDistance}km`);
      console.log('------------------');
    } catch(e) {}
  });

  console.log('\n--- SELLERS WITH PINNED LOCATIONS ---');
  sellers.forEach(s => {
    console.log(`Seller: ${s.name} (${s.email})`);
    console.log(`  Town: ${s.businessTown}`);
    console.log(`  Lat/Lng: ${s.businessLat}, ${s.businessLng}`);
    console.log('------------------');
  });
}

findTrialUsers();
