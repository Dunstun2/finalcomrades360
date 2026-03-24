const { Otp } = require('./models/index');

async function syncDb() {
  try {
    await Otp.sync();
    console.log('Otp table synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error synchronizing Otp table:', error);
    process.exit(1);
  }
}

syncDb();
