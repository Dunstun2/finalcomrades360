// backend/seed-contact-page.js
// Seed default ContactPage data in production

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '../../comrades-master/.env') });

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

async function seedContactPage() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if ContactPage data already exists
    const [existingData] = await sequelize.query(`
      SELECT id FROM ContactPage LIMIT 1;
    `);

    if (existingData.length > 0) {
      console.log('✅ ContactPage data already exists');
      process.exit(0);
    }

    console.log('➕ Creating default ContactPage data...');

    // Get an admin user ID for createdBy field
    const [adminUsers] = await sequelize.query(`
      SELECT id FROM User WHERE role = 'admin' LIMIT 1;
    `);

    if (adminUsers.length === 0) {
      console.error('❌ No admin user found. Cannot seed ContactPage.');
      process.exit(1);
    }

    const adminId = adminUsers[0].id;

    // Insert default contact page data
    const contactId = require('crypto').randomUUID();
    
    await sequelize.query(`
      INSERT INTO ContactPage (
        id,
        pageTitle,
        pageSubtitle,
        email,
        phone,
        location,
        availabilityText,
        country,
        city,
        address,
        socialMediaLinks,
        responseTimeText,
        createdBy,
        createdAt,
        updatedAt
      ) VALUES (
        '${contactId}',
        'Get In Touch',
        'We\'d love to hear from you! Reach out to us through any of the channels below.',
        'info@comrades360.shop',
        '+254 (0) 123 456789',
        'Nairobi, Kenya',
        'Available Monday - Friday, 9:00 AM - 6:00 PM EAT',
        'Kenya',
        'Nairobi',
        'Comrades360 Plaza, Nairobi',
        '[]',
        'We typically respond within 1-2 business days.',
        '${adminId}',
        NOW(),
        NOW()
      );
    `);

    console.log('✅ Default ContactPage data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding ContactPage:', error);
    process.exit(1);
  }
}

seedContactPage();
