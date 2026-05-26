const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function migrate() {
    try {
        await sequelize.getQueryInterface().addColumn('Batches', 'isActive', {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        });
        console.log("Migration successful.");
    } catch (e) {
        if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
            console.log("Column already exists.");
        } else {
            console.error("Migration failed:", e);
        }
    }
    process.exit(0);
}
migrate();
