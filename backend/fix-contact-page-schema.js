// backend/fix-contact-page-schema.js
// Add missing columns to ContactPage table in production

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log
  }
);

async function fixContactPageSchema() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if ContactPage table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'ContactPage';
    `);

    if (tables.length === 0) {
      console.log('⚠️ ContactPage table does not exist. Creating it...');
      
      // Create the table with all columns
      await sequelize.query(`
        CREATE TABLE ContactPage (
          id VARCHAR(36) PRIMARY KEY,
          pageTitle VARCHAR(255) DEFAULT 'Get In Touch',
          pageSubtitle TEXT,
          email VARCHAR(255),
          phone VARCHAR(50),
          location VARCHAR(255),
          availabilityText TEXT,
          country VARCHAR(100),
          city VARCHAR(100),
          address VARCHAR(255),
          latitude VARCHAR(50),
          longitude VARCHAR(50),
          socialMediaLinks JSON,
          responseTimeText VARCHAR(255) DEFAULT 'I typically respond within 1-2 business days.',
          googleMapsEmbedUrl TEXT,
          createdBy VARCHAR(36) NOT NULL,
          updatedBy VARCHAR(36),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ ContactPage table created');
    } else {
      console.log('✅ ContactPage table exists');
      
      // Get existing columns
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
        AND TABLE_NAME = 'ContactPage';
      `);
      
      const existingColumns = columns.map(col => col.COLUMN_NAME);
      console.log('📋 Existing columns:', existingColumns);

      // Define columns that should exist
      const requiredColumns = {
        pageTitle: "ADD COLUMN pageTitle VARCHAR(255) DEFAULT 'Get In Touch'",
        pageSubtitle: "ADD COLUMN pageSubtitle TEXT",
        email: "ADD COLUMN email VARCHAR(255)",
        phone: "ADD COLUMN phone VARCHAR(50)",
        location: "ADD COLUMN location VARCHAR(255)",
        availabilityText: "ADD COLUMN availabilityText TEXT",
        country: "ADD COLUMN country VARCHAR(100)",
        city: "ADD COLUMN city VARCHAR(100)",
        address: "ADD COLUMN address VARCHAR(255)",
        latitude: "ADD COLUMN latitude VARCHAR(50)",
        longitude: "ADD COLUMN longitude VARCHAR(50)",
        socialMediaLinks: "ADD COLUMN socialMediaLinks JSON",
        responseTimeText: "ADD COLUMN responseTimeText VARCHAR(255) DEFAULT 'I typically respond within 1-2 business days.'",
        googleMapsEmbedUrl: "ADD COLUMN googleMapsEmbedUrl TEXT",
        createdBy: "ADD COLUMN createdBy VARCHAR(36) NOT NULL",
        updatedBy: "ADD COLUMN updatedBy VARCHAR(36)",
        createdAt: "ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP",
        updatedAt: "ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      };

      // Add missing columns
      for (const [columnName, alterStatement] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(columnName)) {
          console.log(`➕ Adding column: ${columnName}`);
          try {
            await sequelize.query(`ALTER TABLE ContactPage ${alterStatement};`);
            console.log(`✅ Added column: ${columnName}`);
          } catch (err) {
            console.error(`❌ Failed to add ${columnName}:`, err.message);
          }
        } else {
          console.log(`✓ Column already exists: ${columnName}`);
        }
      }
    }

    console.log('✅ ContactPage schema fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing ContactPage schema:', error);
    process.exit(1);
  }
}

fixContactPageSchema();
