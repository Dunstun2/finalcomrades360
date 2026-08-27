#!/usr/bin/env node
/**
 * Check the actual schema of blog-related tables in production
 */

const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function checkSchemas() {
  try {
    console.log('🔍 Checking blog table schemas...\n');

    const tables = ['BlogPost', 'BlogComment', 'BlogLike', 'BlogRating'];

    for (const table of tables) {
      console.log(`\n📋 ${table} Schema:`);
      console.log('─'.repeat(80));
      
      const columns = await sequelize.query(
        `DESCRIBE ${table}`,
        { type: QueryTypes.SELECT }
      );

      columns.forEach(col => {
        console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    console.log('\n✅ Schema check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchemas();
