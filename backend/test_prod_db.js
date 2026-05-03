const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Manually load .env.production
const prodEnvPath = path.resolve(__dirname, '..', '.env.production');
if (fs.existsSync(prodEnvPath)) {
    dotenv.config({ path: prodEnvPath, override: true });
}

process.env.NODE_ENV = 'production';

const config = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected to Production DB');
        
        const [results] = await sequelize.query("DESCRIBE User");
        const hasIsDeactivated = results.some(r => r.Field === 'isDeactivated');
        
        console.log('User table has isDeactivated:', hasIsDeactivated);
        
        const [countResult] = await sequelize.query("SELECT COUNT(*) as total FROM User");
        console.log('Total Users:', countResult[0].total);

        const [activeResult] = await sequelize.query("SELECT COUNT(*) as active FROM User WHERE isDeactivated = 0");
        console.log('Active Users (isDeactivated=0):', activeResult[0].active);

        process.exit(0);
    } catch (err) {
        console.error('Full Error:', err);
        process.exit(1);
    }
}

test();
