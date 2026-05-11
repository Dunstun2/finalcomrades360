const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function fixFulfillmentSchema() {
  console.log('🚀 Starting Fulfillment Database Repair...');
  const queryInterface = sequelize.getQueryInterface();

  const addColumnSafely = async (tableName, columnName, definition) => {
    try {
      await queryInterface.addColumn(tableName, columnName, definition);
      console.log(`✅ Column '${columnName}' added successfully to '${tableName}'.`);
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log(`⚠️ Column '${columnName}' already exists in '${tableName}'. Skipping...`);
      } else {
        console.error(`❌ Error adding column '${columnName}' to '${tableName}':`, error.message);
      }
    }
  };

  try {
    // 1. Add columns to Orders table
    console.log('\n--- Patching Orders Table ---');
    await addColumnSafely('Orders', 'batchId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Batches',
        key: 'id'
      }
    });

    await addColumnSafely('Orders', 'deliveryTimePreference', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer preferred time of delivery'
    });

    // 2. Add columns to Batches table
    console.log('\n--- Patching Batches Table ---');
    await addColumnSafely('Batches', 'expectedDelivery', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '12:00',
      comment: 'Expected delivery time (HH:MM)'
    });

    console.log('\n✨ Database repair completed successfully!');
  } catch (error) {
    console.error('\n💥 Critical failure during database repair:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixFulfillmentSchema();
