const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

async function syncProductionDb() {
  try {
    console.log('🚀 Starting Production Database Sync...');
    const queryInterface = sequelize.getQueryInterface();
    
    // --- 1. USER TABLE ---
    console.log('📊 Checking User table...');
    const userTableInfo = await queryInterface.describeTable('User');

    const userCols = [
      { name: 'businessLat', type: DataTypes.DECIMAL(10, 8) },
      { name: 'autoConfirmFastFood', type: DataTypes.BOOLEAN, def: false },
      { name: 'autoConfirmProducts', type: DataTypes.BOOLEAN, def: false },
      { name: 'defaultProductShippingType', type: DataTypes.STRING }
    ];

    for (const col of userCols) {
      if (!userTableInfo[col.name]) {
        console.log(`➕ User: Adding column ${col.name}`);
        const opts = { type: col.type, allowNull: true };
        if (col.def !== undefined) opts.defaultValue = col.def;
        await queryInterface.addColumn('User', col.name, opts);
      }
    }

    // --- 2. ORDER TABLE ---
    console.log('📊 Checking Orders table...');
    const orderTableInfo = await queryInterface.describeTable('Orders');

    const orderCols = [
      { name: 'marketerId', type: DataTypes.INTEGER },
      { name: 'isMarketingOrder', type: DataTypes.BOOLEAN, def: false },
      { name: 'customerName', type: DataTypes.STRING },
      { name: 'customerPhone', type: DataTypes.STRING },
      { name: 'customerEmail', type: DataTypes.STRING },
      { name: 'marketingDeliveryAddress', type: DataTypes.TEXT }
    ];

    for (const col of orderCols) {
      if (!orderTableInfo[col.name]) {
        console.log(`➕ Orders: Adding column ${col.name}`);
        const opts = { type: col.type, allowNull: true };
        if (col.def !== undefined) opts.defaultValue = col.def;
        await queryInterface.addColumn('Orders', col.name, opts);
      }
    }

    // --- 3. ORDERITEM TABLE ---
    console.log('📊 Checking OrderItem table...');
    const itemTableInfo = await queryInterface.describeTable('OrderItem');

    const itemCols = [
      { name: 'sellerId', type: DataTypes.INTEGER },
      { name: 'commissionAmount', type: DataTypes.FLOAT, def: 0 }
    ];

    for (const col of itemCols) {
      if (!itemTableInfo[col.name]) {
        console.log(`➕ OrderItem: Adding column ${col.name}`);
        const opts = { type: col.type, allowNull: true };
        if (col.def !== undefined) opts.defaultValue = col.def;
        await queryInterface.addColumn('OrderItem', col.name, opts);
      }
    }

    console.log('✅ Database sync completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync Failed:', error.message);
    process.exit(1);
  }
}

syncProductionDb();
