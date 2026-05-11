const { sequelize } = require('./models');

async function checkFulfillmentSchema() {
  console.log('🔍 Checking Fulfillment Schema Integrity...');
  const queryInterface = sequelize.getQueryInterface();

  const checkTable = async (tableName) => {
    try {
      const describe = await queryInterface.describeTable(tableName);
      console.log(`\n📊 Table: ${tableName}`);
      return describe;
    } catch (error) {
      console.error(`❌ Table '${tableName}' does not exist!`);
      return null;
    }
  };

  try {
    // Check Orders Table
    const orderColumns = await checkTable('Orders');
    if (orderColumns) {
      const requiredOrderCols = ['batchId', 'deliveryTimePreference'];
      requiredOrderCols.forEach(col => {
        if (orderColumns[col]) {
          console.log(`✅ Orders.${col} exists (Type: ${orderColumns[col].type})`);
        } else {
          console.error(`🚨 Orders.${col} is MISSING!`);
        }
      });
    }

    // Check Batches Table
    const batchColumns = await checkTable('Batches');
    if (batchColumns) {
      const requiredBatchCols = ['expectedDelivery', 'name'];
      requiredBatchCols.forEach(col => {
        if (batchColumns[col]) {
          console.log(`✅ Batches.${col} exists (Type: ${batchColumns[col].type})`);
        } else {
          console.error(`🚨 Batches.${col} is MISSING!`);
        }
      });
    } else {
      console.error('🚨 Table "Batches" is MISSING entirely!');
    }

  } catch (error) {
    console.error('💥 Error during check:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkFulfillmentSchema();
