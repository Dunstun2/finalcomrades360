const { sequelize } = require('./models');

async function checkFulfillmentSchema() {
  console.log('🔍 Checking Fulfillment Schema Integrity...');
  const queryInterface = sequelize.getQueryInterface();

  const checkTable = async (tableName) => {
    try {
      const describe = await queryInterface.describeTable(tableName);
      return describe;
    } catch (error) {
      return null;
    }
  };

  const findTable = async (singular, plural) => {
    let cols = await checkTable(singular);
    if (cols) return { name: singular, columns: cols };
    cols = await checkTable(plural);
    if (cols) return { name: plural, columns: cols };
    return null;
  };

  try {
    // Check Orders Table
    const orderInfo = await findTable('Order', 'Orders');
    if (orderInfo) {
      console.log(`\n📊 Table Found: ${orderInfo.name}`);
      const requiredOrderCols = ['batchId', 'deliveryTimePreference'];
      requiredOrderCols.forEach(col => {
        if (orderInfo.columns[col]) {
          console.log(`✅ ${orderInfo.name}.${col} exists`);
        } else {
          console.error(`🚨 ${orderInfo.name}.${col} is MISSING!`);
        }
      });
    } else {
      console.error('🚨 Neither "Order" nor "Orders" table exists!');
    }

    // Check Batches Table
    const batchInfo = await findTable('Batch', 'Batches');
    if (batchInfo) {
      console.log(`\n📊 Table Found: ${batchInfo.name}`);
      const requiredBatchCols = ['expectedDelivery', 'name'];
      requiredBatchCols.forEach(col => {
        if (batchInfo.columns[col]) {
          console.log(`✅ ${batchInfo.name}.${col} exists`);
        } else {
          console.error(`🚨 ${batchInfo.name}.${col} is MISSING!`);
        }
      });
    } else {
      console.error('🚨 Neither "Batch" nor "Batches" table exists!');
    }

  } catch (error) {
    console.error('💥 Error during check:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkFulfillmentSchema();
