const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
});

const runMigrations = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        const queryInterface = sequelize.getQueryInterface();

        // Check User table columns
        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Order', 'Orders', 'PickupStation', 'PickupStations');");
        console.log('📊 Tables found:', tables.map(t => t.name).join(', '));

        const [columns] = await sequelize.query("PRAGMA table_info(PickupStations);");
        if (columns.length > 0) {
            const columnNames = columns.map(c => c.name);
            console.log('📊 PickupStations columns:', columnNames.join(', '));
        } else {
            console.log('❌ PickupStations table does not exist or has no columns.');
        }

        const [userColumns] = await sequelize.query("PRAGMA table_info(User);");
        const userColumnNames = userColumns.map(c => c.name);
        console.log('📊 Current User table columns:', userColumnNames.join(', '));

        const missingColumns = [
            'businessName',
            'businessAddress',
            'businessCounty',
            'businessTown',
            'businessLandmark',
            'businessPhone',
            'dashboardPassword'
        ].filter(col => !userColumnNames.includes(col));

        if (missingColumns.length > 0) {
            console.log(`⚠️ Missing columns in User table: ${missingColumns.join(', ')}`);
            console.log('🛠️ Adding missing columns...');

            for (const col of missingColumns) {
                try {
                    await queryInterface.addColumn('User', col, { type: Sequelize.STRING });
                    console.log(`✅ Added ${col}`);
                } catch (err) {
                    console.error(`❌ Failed to add ${col}:`, err.message);
                }
            }
        } else {
            console.log('✅ All business location columns already exist in User table.');
        }

        // Run other table creations just in case
        const tableMigrations = [
            '20260216_create_pickup_station_table.js',
            '20260216_create_warehouse_table.js',
            '20260216_add_warehouse_id_to_orders.js',
            '20260303_add_checkout_group_to_orders.js',
            '20260320142000-add-business-name-to-users.js',
            '20260320142600-add-dashboard-password-to-users.js'
        ];

        for (const migrationFile of tableMigrations) {
            const migrationPath = path.join(__dirname, 'migrations', migrationFile);
            if (fs.existsSync(migrationPath)) {
                try {
                    const migration = require(migrationPath);
                    await migration.up(queryInterface, Sequelize);
                    console.log(`✅ Verified/Ran ${migrationFile}`);
                } catch (e) {
                    console.error(`❌ Error running ${migrationFile}:`, e.message);
                }
            }
        }

        console.log('\n✨ Migration checks completed.');

    } catch (error) {
        console.error('❌ Script failed:', error);
    } finally {
        await sequelize.close();
    }
};

runMigrations();
