const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  console.log('🔄 Adding sellerId to OrderItem table...');

  const tableInfo = await queryInterface.describeTable('OrderItem');

  if (!tableInfo.sellerId) {
    console.log('➕ Adding sellerId column...');
    await queryInterface.addColumn('OrderItem', 'sellerId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to User (seller) who owns this item'
    });
    
    console.log('📊 Creating index on sellerId...');
    await queryInterface.addIndex('OrderItem', ['sellerId'], {
      name: 'orderitem_seller_id_index'
    });
    
    console.log('✅ sellerId column added to OrderItem');
  } else {
    console.log('✅ sellerId column already exists in OrderItem');
  }

  console.log('🔄 Making Order.sellerId nullable...');
  const orderInfo = await queryInterface.describeTable('Order');
  if (orderInfo.sellerId && !orderInfo.sellerId.allowNull) {
    console.log('➕ Updating Order.sellerId to allow NULL...');
    await queryInterface.changeColumn('Order', 'sellerId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK to User (seller) - deprecated in favor of OrderItem.sellerId for multi-seller orders'
    });
    console.log('✅ Order.sellerId is now nullable');
  } else {
    console.log('✅ Order.sellerId is already nullable');
  }

  console.log('✅ Migration completed successfully');
}

async function down(queryInterface) {
  console.log('🔄 Rolling back sellerId changes in OrderItem table...');
  const tableInfo = await queryInterface.describeTable('OrderItem');
  if (tableInfo.sellerId) {
    await queryInterface.removeColumn('OrderItem', 'sellerId');
  }
  console.log('✅ Rollback completed successfully');
}

module.exports = { up, down };
