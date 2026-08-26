const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment files
const envPaths = [
  path.resolve(__dirname, '..', '.env.production'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', 'backend', '.env.production'),
  path.resolve(__dirname, '..', 'backend', '.env')
];

envPaths.forEach(p => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
  }
});

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, '..', 'backend', 'database.sqlite'),
    logging: false
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    username: process.env.PROD_DB_USER || process.env.DB_USER || 'root',
    password: process.env.PROD_DB_PASS || process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.PROD_DB_NAME || process.env.DB_NAME || 'comrades360',
    host: process.env.PROD_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PROD_DB_PORT || process.env.DB_PORT || 3306),
    dialect: process.env.PROD_DB_DIALECT || process.env.DB_DIALECT || 'mysql',
    logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: process.env.DB_SSL === 'true',
        rejectUnauthorized: false
      }
    }
  }
};

