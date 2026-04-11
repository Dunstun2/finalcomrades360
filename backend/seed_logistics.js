const { Warehouse, PickupStation, sequelize } = require('./models');

const warehouses = [
  {
    name: 'Nairobi Central Warehouse',
    code: 'WH-NRB-01',
    address: 'Lunga Lunga Road, Industrial Area',
    county: 'Nairobi',
    town: 'Nairobi',
    landmark: 'Opposite KBL',
    contactPerson: 'John Kamau',
    contactPhone: '+254712345678',
    capacity: 5000,
    operatingHours: 'Mon-Sat 7AM-7PM'
  },
  {
    name: 'Mombasa Port Hub',
    code: 'WH-MBA-01',
    address: 'Mombasa Port, Terminal 2',
    county: 'Mombasa',
    town: 'Mombasa',
    landmark: 'Port Entrance',
    contactPerson: 'Sarah Chengo',
    contactPhone: '+254722334455',
    capacity: 10000,
    operatingHours: '24/7'
  },
  {
    name: 'Kisumu Lakeside Warehouse',
    code: 'WH-KSM-01',
    address: 'Obote Road',
    county: 'Kisumu',
    town: 'Kisumu',
    landmark: 'Lakeside Mall',
    contactPerson: 'Kevin Odhiambo',
    contactPhone: '+254733445566',
    capacity: 3000,
    operatingHours: 'Mon-Fri 8AM-5PM'
  },
  {
    name: 'Eldoret Highlands Depot',
    code: 'WH-ELD-01',
    address: 'Uganda Road',
    county: 'Uasin Gishu',
    town: 'Eldoret',
    landmark: 'Rupa Mall',
    contactPerson: 'Mary Wanjiku',
    contactPhone: '+254711223344',
    capacity: 4000,
    operatingHours: 'Mon-Sat 8AM-6PM'
  }
];

const pickupStations = [
  {
    name: 'Westlands Pick Station',
    location: 'Westlands Mall, Ground Floor',
    contactPhone: '+254744556677',
    operatingHours: 'Daily 9AM-8PM',
    price: 150,
    notes: 'Located near the main entrance'
  },
  {
    name: 'CBD Imenti Station',
    location: 'Imenti House, Mezzanine 1',
    contactPhone: '+254755667788',
    operatingHours: 'Mon-Sat 8AM-7PM',
    price: 100,
    notes: 'Busy location, expect slight delays during peak hours'
  },
  {
    name: 'Thika Road Mall (TRM) Station',
    location: 'TRM Parking Ground',
    contactPhone: '+254766778899',
    operatingHours: 'Daily 10AM-9PM',
    price: 200,
    notes: 'Next to the car wash'
  }
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    console.log('Seeding warehouses...');
    for (const wh of warehouses) {
      await Warehouse.findOrCreate({
        where: { code: wh.code },
        defaults: wh
      });
    }
    console.log('Warehouses seeded successfully.');

    console.log('Seeding pickup stations...');
    for (const ps of pickupStations) {
      await PickupStation.findOrCreate({
        where: { name: ps.name },
        defaults: ps
      });
    }
    console.log('Pickup stations seeded successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
