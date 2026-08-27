#!/usr/bin/env node
/**
 * Add userAgent column to BlogLike table
 */

const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function addUserAgentColumn() {
  try {
    console.log('🔧 Adding userAgent column to BlogLike table...\n');

    // Add userAgent column
    await sequelize.query(
      'ALTER TABLE BlogLike ADD COLUMN userAgent VARCHAR(500) NULL',
      { type: QueryTypes.RAW }
    );

    console.log('✅ Added userAgent column to BlogLike');
    
    // Also add to BlogRating if it doesn't exist
    try {
      await sequelize.query(
        'ALTER TABLE BlogRating ADD COLUMN ipAddress VARCHAR(45) NULL',
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added ipAddress column to BlogRating');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️  ipAddress already exists in BlogRating');
      } else {
        console.log('⚠️  BlogRating ipAddress:', e.message);
      }
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('ℹ️  userAgent column already exists');
      process.exit(0);
    }
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUserAgentColumn();
