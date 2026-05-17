const path = require('path');
const { sequelize } = require(path.resolve(__dirname, '..', 'database', 'database'));
const models = require(path.resolve(__dirname, '..', 'models'));
const { Order, User, Warehouse, PickupStation, DeliveryAgentProfile } = models;
const { checkProfileCompleteness, isAgentAvailableNow, calculateDistance } = require('../utils/deliveryUtils');

async function testAvailableAgents() {
  console.log('🔍 Testing getAvailableAgentsForOrder Logic...');
  try {
    const orderId = 112; // Test with the order ID the user is having trouble with
    
    // 1. Fetch Order
    console.log('Fetching order...');
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'seller' },
        { model: Warehouse, as: 'Warehouse' },
        { model: PickupStation, as: 'PickupStation' },
        { model: Warehouse, as: 'DestinationWarehouse' },
        { model: PickupStation, as: 'DestinationPickStation' }
      ]
    });
    
    if (!order) {
      console.log('❌ Order not found!');
      process.exit(0);
    }
    console.log('✅ Order fetched successfully.');

    // 2. Fetch Agents
    console.log('Fetching agents...');
    const agents = await User.findAll({
      where: { role: 'delivery_agent' },
      include: [{ model: DeliveryAgentProfile, as: 'deliveryProfile' }]
    });
    console.log(`✅ Fetched ${agents.length} agents.`);

    // 3. Process matches
    console.log('Processing matches...');
    
    const sellerLat = order.seller?.businessLat;
    const sellerLng = order.seller?.businessLng;
    const customerLat = order.deliveryLat;
    const customerLng = order.deliveryLng;

    const targetWarehouse = order.DestinationWarehouse || order.Warehouse;
    const targetPickStation = order.DestinationPickStation || order.PickupStation;

    const warehouseLat = targetWarehouse?.lat || targetPickStation?.lat;
    const warehouseLng = targetWarehouse?.lng || targetPickStation?.lng;

    const parseLocation = (loc) => {
      if (!loc) return null;
      if (typeof loc === 'object') return loc;
      try {
        return JSON.parse(loc);
      } catch (e) {
        return null;
      }
    };

    const matches = agents.map(agent => {
      const profile = agent.deliveryProfile;
      const agentLocation = profile ? parseLocation(profile.currentLocation) : null;
      const agentLat = agentLocation ? agentLocation.lat : null;
      const agentLng = agentLocation ? agentLocation.lng : null;

      const distances = {
        agentToSeller: (agentLat && agentLng && sellerLat && sellerLng) ? calculateDistance(agentLat, agentLng, sellerLat, sellerLng) : null,
        agentToCustomer: (agentLat && agentLng && customerLat && customerLng) ? calculateDistance(agentLat, agentLng, customerLat, customerLng) : null,
        agentToWarehouse: (agentLat && agentLng && warehouseLat && warehouseLng) ? calculateDistance(agentLat, agentLng, warehouseLat, warehouseLng) : null,
        sellerToCustomer: (sellerLat && sellerLng && customerLat && customerLng) ? calculateDistance(sellerLat, sellerLng, customerLat, customerLng) : null,
        sellerToWarehouse: (sellerLat && sellerLng && warehouseLat && warehouseLng) ? calculateDistance(sellerLat, sellerLng, warehouseLat, warehouseLng) : null
      };

      const { isComplete, missing } = checkProfileCompleteness(profile, agent);
      const isAvailable = profile ? isAgentAvailableNow(profile) : false;

      return {
        agent: {
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          isActive: profile?.isActive || false,
          isAvailable: isAvailable,
          isComplete: isComplete
        },
        distances
      };
    });

    console.log('✅ Matches processed successfully!');
    console.log(`Returned ${matches.length} matches.`);
    
  } catch (err) {
    console.error('💥 Crash occurred:', err);
  } finally {
    await sequelize.close();
  }
}

testAvailableAgents();
