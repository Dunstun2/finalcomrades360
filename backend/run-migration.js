#!/usr/bin/env node
/**
 * run-migration.js
 * ─────────────────────────────────────────────────────────────
 * Standalone runner for the add-blog-and-banner-columns migration.
 * Works WITHOUT sequelize-cli.
 *
 * Usage (from the /backend directory):
 *   node run-migration.js
 *
 * It connects using the same DB configuration as the main app
 * (reads .env automatically) and then runs the migration up().
 */

require('dotenv').config();
const path = require('path');

// Reuse the app's sequelize instance so it uses the correct .env / DB settings
const { sequelize } = require('./database/database');
const migration = require('./database/migrations/add-blog-and-banner-columns');

const queryInterface = sequelize.getQueryInterface();

(async () => {
  console.log('🚀 Starting migration: add-blog-and-banner-columns');
  console.log(`   DB dialect : ${sequelize.getDialect()}`);
  console.log(`   DB host    : ${sequelize.config.host || 'local'}`);
  console.log(`   DB name    : ${sequelize.config.database}\n`);

  try {
    await migration.up(queryInterface, sequelize.constructor);
    console.log('✅ Migration finished successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
