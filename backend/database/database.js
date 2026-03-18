const { Sequelize } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables with absolute path logging
const envPath = path.resolve(process.cwd(), '.env');
const envPathAlt = path.resolve(process.cwd(), 'backend', '.env');

console.log(`[Database] Attempting to load .env from: ${envPath}`);
dotenv.config({ path: envPath });
dotenv.config({ path: envPathAlt }); // Fallback for various cPanel structures

// Enhanced Environment Detection for Shared Hosting (TrueHost)
const hasDbCreds = !!(process.env.DB_NAME && process.env.DB_USER);
const env = hasDbCreds ? 'production' : (process.env.NODE_ENV || 'development');

console.log(`[Database] Mode: ${env} (Detected via: ${hasDbCreds ? 'DB Credentials' : 'NODE_ENV'})`);
if (env === 'production') {
  console.log(`[Database] Connecting to MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log(`[Database] DB Name: ${process.env.DB_NAME}`);
  console.log(`[Database] DB User: ${process.env.DB_USER}`);
  if (!process.env.DB_USER || !process.env.DB_USER.includes('_')) {
    console.warn('⚠️ WARNING: Your DB_USER might be missing the cPanel prefix (e.g. vdranjxy_).');
  }
}

// Database configuration
const config = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, '..', 'database.sqlite'),
    logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
    dialectOptions: {
      mode: 2 | 4 // OPEN_READWRITE | OPEN_CREATE
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000,
    },
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql', // Explicitly force mysql for production config
    logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 20000,
    },
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {},
  },
};

const dbConfig = config[env];
if (dbConfig.dialect === 'sqlite') {
  console.log(`[Database] SQLite Storage Path: ${dbConfig.storage}`);
}

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  ...dbConfig,
  benchmark: env === 'development',
  retry: {
    max: 3,
    timeout: 90000,
  },
});

// Enable WAL mode (Only for SQLite)
sequelize.afterConnect(async (connection) => {
  if (dbConfig.dialect !== 'sqlite') return;

  try {
    if (connection.run) {
      connection.run('PRAGMA journal_mode=WAL;');
      connection.run('PRAGMA synchronous=NORMAL;');
      connection.run('PRAGMA temp_store=MEMORY;');
      connection.run('PRAGMA cache_size=-64000;');
      connection.run('PRAGMA mmap_size=268435456;');
    } else if (connection.execute) {
      await connection.execute('PRAGMA journal_mode=WAL;');
      await connection.execute('PRAGMA synchronous=NORMAL;');
      await connection.execute('PRAGMA temp_store=MEMORY;');
      await connection.execute('PRAGMA cache_size=-64000;');
      await connection.execute('PRAGMA mmap_size=268435456;');
    }
    console.log('✅ SQLite WAL Mode Enabled');
  } catch (err) {
    console.warn('⚠️ Could not enable WAL mode:', err.message);
  }
});

// Test the database connection and sync models
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connected successfully (${dbConfig.dialect})`);

    // Sync all models ONLY in production or if explicitly requested via env
    // Scaling issue: Syncing 40+ models on every dev restart causes SQLite locks/hangs
    console.log(`[Database] Debug: env=${env}, DB_SYNC=${process.env.DB_SYNC} (type: ${typeof process.env.DB_SYNC})`);
    if (env === 'production' || process.env.DB_SYNC === 'true' || process.env.DB_SYNC === true) {
      console.log('🔄 Synchronizing database models...');
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Database models synchronized');
    } else {
      console.log('ℹ️ Skipping auto-sync (Development mode). Use DB_SYNC=true if schema changed.');
    }

    // Self-healing: Enforce default roles to fix FK constraints on registration
    if (env === 'production') {
      try {
        const [results] = await sequelize.query("SELECT id FROM Roles WHERE id = 'customer' LIMIT 1");
        if (results.length === 0) {
          console.log('🌱 Seeding default roles...');
          // Using raw query to be safe
          await sequelize.query("INSERT INTO Roles (id, name, createdAt, updatedAt) VALUES ('customer', 'Customer', NOW(), NOW())");
          await sequelize.query("INSERT INTO Roles (id, name, createdAt, updatedAt) VALUES ('admin', 'Admin', NOW(), NOW())");
          console.log('✅ Default roles created');
        }
      } catch (roleErr) {
        console.warn('⚠️ Warning: Could not check/seed roles (this is okay if table is missing or already filled):', roleErr.message);
      }
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Export the database connection and Sequelize constructor
module.exports = {
  sequelize,
  Sequelize,
  testConnection,
};
