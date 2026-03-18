const { sequelize } = require('./database/database');

async function check() {
    try {
        const [results1] = await sequelize.query("PRAGMA table_info(PickupStation)");
        console.log("SCHEMA_PICKUP_SINGULAR_START");
        console.log(JSON.stringify(results1, null, 2));
        console.log("SCHEMA_PICKUP_SINGULAR_END");

        const [results2] = await sequelize.query("PRAGMA table_info(PickupStations)");
        console.log("SCHEMA_PICKUP_PLURAL_START");
        console.log(JSON.stringify(results2, null, 2));
        console.log("SCHEMA_PICKUP_PLURAL_END");

        const [results3] = await sequelize.query("PRAGMA table_info(Warehouse)");
        console.log("SCHEMA_WAREHOUSE_START");
        console.log(JSON.stringify(results3, null, 2));
        console.log("SCHEMA_WAREHOUSE_END");

        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("TABLES_START");
        console.log(JSON.stringify(tables, null, 2));
        console.log("TABLES_END");
    } catch (err) {
        console.error("SCHEMA_ERROR", err.message);
    } finally {
        await sequelize.close();
    }
}

check();
