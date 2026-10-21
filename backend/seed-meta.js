#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Load the same DB config Sequelize CLI uses
const env = process.env.NODE_ENV || 'production';
const config = require('./config/database.js')[env] || require('./config/database.js');

async function run() {
  const sequelize = new Sequelize(config);
  await sequelize.authenticate();
  console.log('✅ Connected to database');

  // Get all migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const allFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

  // The NEW migration we actually want to run
  const skip = '20261021000000-guest-role-application.js';

  // All migrations EXCEPT the new one
  const existing = allFiles.filter(f => f !== skip);

  // Check what's already in SequelizeMeta
  const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta');
  const alreadyRecorded = new Set(rows.map(r => r.name));

  let inserted = 0;
  for (const name of existing) {
    if (!alreadyRecorded.has(name)) {
      await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
        replacements: [name]
      });
      inserted++;
      console.log(`  ✓ ${name}`);
    }
  }

  console.log(`\n✅ Done! Inserted ${inserted} records. ${alreadyRecorded.size} were already recorded.`);
  console.log('Now run: npx sequelize-cli db:migrate');
  await sequelize.close();
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
