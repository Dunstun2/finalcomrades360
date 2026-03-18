const { sequelize } = require('./database/database');
const { DataTypes } = require('sequelize');

async function fixSchemaManual() {
    try {
        console.log('🔄 Checking Database Columns...');
        const queryInterface = sequelize.getQueryInterface();

        // 1. Check OrderItem columns
        const orderItemCols = await queryInterface.describeTable('OrderItem');
        if (!orderItemCols.commissionAmount) {
            console.log('➕ Adding commissionAmount to OrderItem...');
            await queryInterface.addColumn('OrderItem', 'commissionAmount', {
                type: DataTypes.FLOAT,
                defaultValue: 0
            });
            console.log('✅ Added commissionAmount.');
        } else {
            console.log('✔ commissionAmount already exists in OrderItem.');
        }

        // 2. Check Order columns
        const orderCols = await queryInterface.describeTable('Order');
        if (!orderCols.checkoutOrderNumber) {
            console.log('➕ Adding checkoutOrderNumber to Order...');
            await queryInterface.addColumn('Order', 'checkoutOrderNumber', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ Added checkoutOrderNumber.');
        } else {
            console.log('✔ checkoutOrderNumber already exists in Order.');
        }

        if (!orderCols.checkoutGroupId) {
            console.log('➕ Adding checkoutGroupId to Order...');
            await queryInterface.addColumn('Order', 'checkoutGroupId', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ Added checkoutGroupId.');
        } else {
            console.log('✔ checkoutGroupId already exists in Order.');
        }

        console.log('✨ Database schema fix complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing schema manual:', err);
        process.exit(1);
    }
}

fixSchemaManual();
