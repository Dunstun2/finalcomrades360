const { User } = require('./models');

async function checkMarketers() {
  try {
    const marketers = await User.findAll({
      where: { role: 'marketer' },
      attributes: ['name', 'email', 'phone'],
      limit: 5
    });
    console.log('Marketers found:', JSON.stringify(marketers, null, 2));
  } catch (err) {
    console.error('Error fetching marketers:', err.message);
  } finally {
    process.exit();
  }
}

checkMarketers();
