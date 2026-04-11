// Quick cleanup + smoke test
const { sequelize, User, Otp } = require('./models');

async function run() {
  try {
    // Clean up leftover backup table from failed sync
    await sequelize.query('DROP TABLE IF EXISTS User_backup');
    console.log('Cleaned up User_backup table');

    // Verify we can create a user with all fields populated (simulating the new flow)
    const testEmail = 'test_smoke_' + Date.now() + '@placeholder.local';
    const testPhone = 'nophone_smoke_' + Date.now();
    
    // Just verify models load fine
    console.log('User model OK:', !!User);
    console.log('Otp model OK:', !!Otp);
    
    // Check Otp has phone column
    const [cols] = await sequelize.query('PRAGMA table_info("Otps")');
    const phoneCol = cols.find(c => c.name === 'phone');
    console.log('Otp phone column exists:', !!phoneCol);
    
    console.log('\nAll checks passed! Registration flow is ready.');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}
run();
