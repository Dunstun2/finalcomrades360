const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: console.log
});

const migrate = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        const queryInterface = sequelize.getQueryInterface();

        const [columns] = await sequelize.query("PRAGMA table_info(DeliveryTask);");
        const columnNames = columns.map(c => c.name);
        console.log('📊 Current DeliveryTask columns:', columnNames.join(', '));

        const missingColumns = [
            { name: 'systemRevenueClaimed', type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
            { name: 'systemRevenueClaimedAt', type: Sequelize.DATE, allowNull: true },
            { name: 'systemRevenueAmount', type: Sequelize.FLOAT, defaultValue: 0, allowNull: true }
        ].filter(col => !columnNames.includes(col.name));

        if (missingColumns.length > 0) {
            console.log(`⚠️ Missing columns in DeliveryTask table: ${missingColumns.map(c => c.name).join(', ')}`);
            console.log('🛠️ Adding missing columns...');

            for (const col of missingColumns) {
                try {
                    await queryInterface.addColumn('DeliveryTask', col.name, {
                        type: col.type,
                        defaultValue: col.defaultValue,
                        allowNull: col.allowNull
                    });
                    console.log(`✅ Added ${col.name}`);
                } catch (err) {
                    console.error(`❌ Failed to add ${col.name}:`, err.message);
                }
            }
        } else {
            console.log('✅ All system revenue columns already exist in DeliveryTask table.');
        }

        console.log('\n✨ Migration completed.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sequelize.close();
    }
};

migrate();
