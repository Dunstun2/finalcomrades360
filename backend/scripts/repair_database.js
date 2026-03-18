const { sequelize, Payment } = require('../models');

async function repairDatabase() {
    try {
        console.log('🔍 Starting Database Repair...');

        // 1. Check if Payment table exists
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Payment';");

        if (results.length === 0) {
            console.log('ℹ️ Payment table does not exist. Running sync to create it...');
            await Payment.sync({ force: false });
            console.log('✅ Payment table created successfully.');
            return;
        }

        console.log('📦 Found existing Payment table. Migrating data to fix schema...');

        // 2. Rename old table
        const timestamp = Date.now();
        const backupName = `Payment_old_${timestamp}`;
        await sequelize.query(`ALTER TABLE Payment RENAME TO ${backupName};`);
        console.log(`✅ Renamed existing Payment table to ${backupName}`);

        // 2.5 Drop existing indexes to avoid conflicts during sync
        try {
            const [indexes] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'payment_%';");
            for (const idx of indexes) {
                await sequelize.query(`DROP INDEX IF EXISTS ${idx.name};`);
                console.log(`✅ Dropped index ${idx.name}`);
            }
        } catch (e) {
            console.log('ℹ️ No conflicting indexes found.');
        }

        // 3. Create new table with correct schema
        await Payment.sync({ force: false });
        console.log('✅ New Payment table created with correct Foreign Key references.');

        // 4. Copy data if any exists
        const [oldData] = await sequelize.query(`SELECT * FROM ${backupName};`);
        if (oldData.length > 0) {
            console.log(`🚚 Migrating ${oldData.length} records to the new table...`);

            // Map columns and insert
            // Note: Since we fixed the references in the model, the INSERT should work fine
            // We'll use a raw query for the copy to avoid model validation issues during migration
            const columns = Object.keys(oldData[0]).filter(c => c !== 'id').join(', ');
            await sequelize.query(`INSERT INTO Payment (${columns}) SELECT ${columns} FROM ${backupName};`);

            console.log('✅ Data migration complete.');
        } else {
            console.log('ℹ️ No data to migrate from old Payment table.');
        }

        // 5. Cleanup (optional - keeping backup for safety for now)
        // await sequelize.query(`DROP TABLE ${backupName};`);
        console.log(`⚠️ Backup table ${backupName} retained for safety. You can delete it manually later.`);

        console.log('🎊 Database Repair Finished Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database Repair Failed:', error);
        process.exit(1);
    }
}

repairDatabase();
