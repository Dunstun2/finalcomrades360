/**
 * Migration: Add title and subtitle columns to HeroPromotions table
 * Run: node scripts/migrate_hero_promotion_title.js
 */

const path = require('path');
const { sequelize } = require('../database/database');

const migrate = async () => {
    const queryInterface = sequelize.getQueryInterface();

    console.log('🔄 Starting migration: Adding title & subtitle to HeroPromotions...');

    try {
        await sequelize.authenticate();

        // Check if columns already exist to make this idempotent
        const tableDesc = await queryInterface.describeTable('HeroPromotions');

        const columnsToAdd = [];

        if (!tableDesc.title) {
            columnsToAdd.push({ name: 'title', type: 'VARCHAR(255)', defaultValue: null });
        } else {
            console.log('  ✅ Column "title" already exists, skipping.');
        }

        if (!tableDesc.subtitle) {
            columnsToAdd.push({ name: 'subtitle', type: 'VARCHAR(255)', defaultValue: null });
        } else {
            console.log('  ✅ Column "subtitle" already exists, skipping.');
        }

        for (const col of columnsToAdd) {
            await sequelize.query(`ALTER TABLE "HeroPromotions" ADD COLUMN "${col.name}" ${col.type}`);
            console.log(`  ✅ Added column: ${col.name}`);
        }

        console.log('✅ Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

migrate();
