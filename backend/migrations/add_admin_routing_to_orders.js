const { DataTypes } = require('sequelize');

async function resolveOrdersTable(queryInterface) {
  try {
    await queryInterface.describeTable('Order');
    return 'Order';
  } catch (_) {
    await queryInterface.describeTable('Orders');
    return 'Orders';
  }
}

async function up(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    console.log('🚀 Starting migration: add_admin_routing_to_orders');

    // Check if table exists (try singular first, then plural)
    let tableDescription;
    let tableName;
    try {
      tableName = await resolveOrdersTable(queryInterface);
      tableDescription = await queryInterface.describeTable(tableName);
      console.log(`  ℹ️ Using table name: ${tableName}`);
    } catch (e) {
      throw new Error('Order/Orders table not found');
    }

    // Add adminRoutingStrategy enum column
    if (!tableDescription.adminRoutingStrategy) {
      console.log('  ➕ Adding adminRoutingStrategy column...');
      await queryInterface.addColumn(tableName, 'adminRoutingStrategy', {
        type: DataTypes.ENUM('warehouse', 'pick_station', 'direct_delivery'),
        allowNull: true,
        comment: 'Admin-determined routing strategy for order fulfillment'
      }, { transaction });
      console.log('  ✅ Added adminRoutingStrategy');
    } else {
      console.log('  ℹ️ adminRoutingStrategy already exists, skipping');
    }

    // Add destinationWarehouseId foreign key
    if (!tableDescription.destinationWarehouseId) {
      console.log('  ➕ Adding destinationWarehouseId column...');
      await queryInterface.addColumn(tableName, 'destinationWarehouseId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Warehouses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Destination warehouse for seller deliveries (admin-specified)'
      }, { transaction });
      console.log('  ✅ Added destinationWarehouseId');
    } else {
      console.log('  ℹ️ destinationWarehouseId already exists, skipping');
    }

    // Add destinationPickStationId foreign key
    if (!tableDescription.destinationPickStationId) {
      console.log('  ➕ Adding destinationPickStationId column...');
      await queryInterface.addColumn(tableName, 'destinationPickStationId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'PickupStations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Destination pick station for seller deliveries (admin-specified)'
      }, { transaction });
      console.log('  ✅ Added destinationPickStationId');
    } else {
      console.log('  ℹ️ destinationPickStationId already exists, skipping');
    }

    // Add isMultiSellerOrder boolean
    if (!tableDescription.isMultiSellerOrder) {
      console.log('  ➕ Adding isMultiSellerOrder column...');
      await queryInterface.addColumn(tableName, 'isMultiSellerOrder', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Auto-calculated: true if order has items from multiple sellers'
      }, { transaction });
      console.log('  ✅ Added isMultiSellerOrder');
    } else {
      console.log('  ℹ️ isMultiSellerOrder already exists, skipping');
    }

    // Add adminRoutingNotes text field
    if (!tableDescription.adminRoutingNotes) {
      console.log('  ➕ Adding adminRoutingNotes column...');
      await queryInterface.addColumn(tableName, 'adminRoutingNotes', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes about routing decision (visible to sellers)'
      }, { transaction });
      console.log('  ✅ Added adminRoutingNotes');
    } else {
      console.log('  ℹ️ adminRoutingNotes already exists, skipping');
    }

    await transaction.commit();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    console.log('🔄 Rolling back migration: add_admin_routing_to_orders');

    const tableName = await resolveOrdersTable(queryInterface);
    const tableDescription = await queryInterface.describeTable(tableName);

    if (tableDescription.adminRoutingNotes) {
      await queryInterface.removeColumn(tableName, 'adminRoutingNotes', { transaction });
    }
    if (tableDescription.isMultiSellerOrder) {
      await queryInterface.removeColumn(tableName, 'isMultiSellerOrder', { transaction });
    }
    if (tableDescription.destinationPickStationId) {
      await queryInterface.removeColumn(tableName, 'destinationPickStationId', { transaction });
    }
    if (tableDescription.destinationWarehouseId) {
      await queryInterface.removeColumn(tableName, 'destinationWarehouseId', { transaction });
    }
    if (tableDescription.adminRoutingStrategy) {
      await queryInterface.removeColumn(tableName, 'adminRoutingStrategy', { transaction });
    }

    await transaction.commit();
    console.log('✅ Rollback completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
