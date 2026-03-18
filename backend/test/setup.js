const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');
const config = require('../config/config');

// Use test database configuration
const testConfig = config.test;

// Create a test database connection
const sequelize = new Sequelize(
  testConfig.database,
  testConfig.username,
  testConfig.password,
  {
    host: testConfig.host,
    dialect: testConfig.dialect,
    logging: false
  }
);

// Run migrations before tests
beforeAll(async () => {
  try {
    // Create test database if it doesn't exist
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${testConfig.database};`);
    
    // Run migrations
    execSync('npx sequelize-cli db:migrate --env test', { stdio: 'inherit' });
  } catch (error) {
    console.error('Test setup failed:', error);
    process.exit(1);
  }
});

// Clean up after tests
afterAll(async () => {
  try {
    // Drop test database
    await sequelize.query(`DROP DATABASE IF EXISTS ${testConfig.database};`);
    await sequelize.close();
  } catch (error) {
    console.error('Test teardown failed:', error);
  }
});
