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

  const getActualTableName = async (singular, plural) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes(singular)) return singular;
    if (tables.includes(plural)) return plural;
    return null;
  };

  try {
    const orderTable = await getActualTableName('Order', 'Orders');
    const batchTable = await getActualTableName('Batch', 'Batches');

    if (!orderTable) {
      console.error('🚨 Could not find Order or Orders table!');
    } else {
      console.log(`\n--- Patching ${orderTable} Table ---`);
      await addColumnSafely(orderTable, 'batchId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: batchTable || 'Batches',
          key: 'id'
        }
      });

      await addColumnSafely(orderTable, 'deliveryTimePreference', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Customer preferred time of delivery'
      });
    }

    if (!batchTable) {
      console.error('🚨 Could not find Batch or Batches table!');
    } else {
      console.log(`\n--- Patching ${batchTable} Table ---`);
      await addColumnSafely(batchTable, 'expectedDelivery', {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '12:00',
        comment: 'Expected delivery time (HH:MM)'
      });
    }

    console.log('\n✨ Database repair completed successfully!');
  } catch (error) {
    console.error('\n💥 Critical failure during database repair:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixFulfillmentSchema();
