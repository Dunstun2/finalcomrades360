const { sequelize } = require('./backend/database/database');
const { DataTypes } = require('sequelize');

async function fixProductionSchema() {
    console.log('🚀 Starting Emergency Production Database Schema Fix...');
    const queryInterface = sequelize.getQueryInterface();

    const addColumnSafely = async (tableName, columnName, definition) => {
        try {
            // Check if table exists first
            const tables = await queryInterface.showAllTables();
            if (!tables.includes(tableName)) {
                console.log(`⚠️ Table '${tableName}' does not exist. Skipping...`);
                return;
            }

            const tableInfo = await queryInterface.describeTable(tableName);
            if (!tableInfo[columnName]) {
                await queryInterface.addColumn(tableName, columnName, definition);
                console.log(`✅ Column '${columnName}' added successfully to '${tableName}'.`);
            } else {
                console.log(`ℹ️ Column '${columnName}' already exists in '${tableName}'.`);
            }
        } catch (error) {
            console.error(`❌ Error adding column '${columnName}' to '${tableName}':`, error.message);
        }
    };

    try {
        // 1. Fix Orders table
        console.log('\n--- Checking Order Table ---');
        await addColumnSafely('Order', 'deliveryTimePreference', { type: DataTypes.STRING, allowNull: true });
        await addColumnSafely('Order', 'originalTextBlock', { type: DataTypes.TEXT, allowNull: true });
        await addColumnSafely('Order', 'thankYouSent', { type: DataTypes.BOOLEAN, defaultValue: false });
        await addColumnSafely('Order', 'warehouseId', { type: DataTypes.INTEGER, allowNull: true });
        await addColumnSafely('Order', 'checkoutGroup', { type: DataTypes.STRING, allowNull: true });
        await addColumnSafely('Order', 'deliveryAgentId', { type: DataTypes.INTEGER, allowNull: true });

        // 2. Fix OrderItems table
        console.log('\n--- Checking OrderItem Table ---');
        await addColumnSafely('OrderItem', 'sellerId', { type: DataTypes.INTEGER, allowNull: true });
        await addColumnSafely('OrderItem', 'fastFoodId', { type: DataTypes.INTEGER, allowNull: true });
        await addColumnSafely('OrderItem', 'serviceId', { type: DataTypes.INTEGER, allowNull: true });
        await addColumnSafely('OrderItem', 'itemLabel', { type: DataTypes.STRING, allowNull: true });
        await addColumnSafely('OrderItem', 'itemType', { 
            type: DataTypes.ENUM('product', 'fastfood', 'service'), 
            defaultValue: 'product' 
        });

        // 3. Fix Commission table
        console.log('\n--- Checking Commission Table ---');
        await addColumnSafely('Commission', 'fastFoodId', { type: DataTypes.INTEGER, allowNull: true });
        await addColumnSafely('Commission', 'serviceId', { type: DataTypes.INTEGER, allowNull: true });

        // 4. Fix Users table (Seller auto-confirm settings)
        console.log('\n--- Checking User Table ---');
        await addColumnSafely('User', 'autoConfirmFastFood', { type: DataTypes.BOOLEAN, defaultValue: false });
        await addColumnSafely('User', 'autoConfirmProducts', { type: DataTypes.BOOLEAN, defaultValue: false });
        await addColumnSafely('User', 'defaultProductShippingType', {
            type: DataTypes.ENUM('shipped_from_seller', 'collected_from_seller'),
            allowNull: true
        });

        console.log('\n✨ All schema checks completed!');
    } catch (error) {
        console.error('\n💥 Critical failure during schema fix:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

fixProductionSchema();
