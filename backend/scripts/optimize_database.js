const { sequelize } = require('../database/database');
const { QueryTypes } = require('sequelize');

/**
 * Database Performance Optimization Script
 * Adds indexes to commonly-queried columns
 * Optimizes SQLite performance settings
 */

const INDEXES_TO_CREATE = [
  // Orders & OrderItems
  { table: 'Order', columns: ['userId'] },
  { table: 'Order', columns: ['status'] },
  { table: 'Order', columns: ['createdAt'] },
  { table: 'Order', columns: ['sellerId'] },
  { table: 'OrderItem', columns: ['orderId'] },
  { table: 'OrderItem', columns: ['productId'] },

  // Products
  { table: 'Product', columns: ['categoryId'] },
  { table: 'Product', columns: ['subcategoryId'] },
  { table: 'Product', columns: ['sellerId'] },
  { table: 'Product', columns: ['status'] },
  { table: 'Product', columns: ['approved'] },
  { table: 'Product', columns: ['stock'] },
  { table: 'Product', columns: ['createdAt'] },

  // Users
  { table: 'User', columns: ['email'] },
  { table: 'User', columns: ['role'] },
  { table: 'User', columns: ['phone'] },
  { table: 'User', columns: ['createdAt'] },

  // Payments
  { table: 'Payment', columns: ['orderId'] },
  { table: 'Payment', columns: ['userId'] },
  { table: 'Payment', columns: ['status'] },
  { table: 'Payment', columns: ['createdAt'] },

  // Cart
  { table: 'Cart', columns: ['userId'] },
  { table: 'CartItem', columns: ['cartId'] },
  { table: 'CartItem', columns: ['productId'] },

  // Wishlist
  { table: 'Wishlist', columns: ['userId'] },
  { table: 'Wishlist', columns: ['productId'] },

  // Notifications
  { table: 'Notification', columns: ['userId'] },
  { table: 'Notification', columns: ['createdAt'] },
  { table: 'Notification', columns: ['read'] },

  // DeliveryTasks
  { table: 'DeliveryTask', columns: ['orderId'] },
  { table: 'DeliveryTask', columns: ['agentId'] },
  { table: 'DeliveryTask', columns: ['status'] },

  // Stock & Inventory
  { table: 'StockReservations', columns: ['userId'] },
  { table: 'StockReservations', columns: ['productId'] },
  { table: 'StockReservations', columns: ['status'] },
  { table: 'StockAuditLogs', columns: ['productId'] },
  { table: 'StockAuditLogs', columns: ['changeType'] },
  { table: 'WarehouseStocks', columns: ['productId'] },
  { table: 'WarehouseStocks', columns: ['warehouseId'] },

  // Payment Enhancements
  { table: 'PaymentRetryQueues', columns: ['paymentId'] },
  { table: 'PaymentRetryQueues', columns: ['status'] },
  { table: 'Refunds', columns: ['paymentId'] },
  { table: 'PaymentDisputes', columns: ['paymentId'] },

  // Additional useful indexes
  { table: 'ReferralTracking', columns: ['referrerId'] },
  { table: 'Commission', columns: ['marketerId'] },
  { table: 'MarketingAnalytics', columns: ['marketerId'] },
];

async function createIndexes() {
  console.log('🔄 Starting database optimization...\n');

  const isMySQL = sequelize.options.dialect === 'mysql';
  const isSQLite = sequelize.options.dialect === 'sqlite';

  try {
    // Get existing indexes
    let existingIndexes = new Set();
    
    if (isSQLite) {
      console.log('📊 Using SQLite dialect\n');
      
      // For SQLite, fetch all index names
      const indexRows = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='index'",
        { type: QueryTypes.SELECT }
      );
      
      indexRows.forEach(row => {
        existingIndexes.add(row.name.toLowerCase());
      });
    } else if (isMySQL) {
      console.log('📊 Using MySQL dialect\n');
      
      const indexRows = await sequelize.query(
        "SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE()",
        { type: QueryTypes.SELECT }
      );
      
      indexRows.forEach(row => {
        existingIndexes.add(row.INDEX_NAME.toLowerCase());
      });
    }

    let created = 0;
    let skipped = 0;

    for (const idx of INDEXES_TO_CREATE) {
      const indexName = `idx_${idx.table.toLowerCase()}_${idx.columns.join('_').toLowerCase()}`;
      
      if (existingIndexes.has(indexName.toLowerCase())) {
        console.log(`⏭️  Skipped: ${indexName} (already exists)`);
        skipped++;
        continue;
      }

      try {
        const columnStr = idx.columns.join(', ');
        
        if (isSQLite) {
          await sequelize.query(
            `CREATE INDEX IF NOT EXISTS ${indexName} ON ${idx.table} (${columnStr})`
          );
        } else if (isMySQL) {
          await sequelize.query(
            `CREATE INDEX ${indexName} ON ${idx.table} (${columnStr})`
          );
        }
        
        console.log(`✅ Created: ${indexName}`);
        created++;
      } catch (err) {
        console.log(`⚠️  Failed to create ${indexName}: ${err.message}`);
      }
    }

    console.log(`\n✅ Index creation complete: ${created} created, ${skipped} skipped\n`);

    // Optimize SQLite settings if using SQLite
    if (isSQLite) {
      console.log('🔧 Optimizing SQLite settings...\n');
      
      const pragmas = [
        'PRAGMA journal_mode = WAL',
        'PRAGMA synchronous = NORMAL',
        'PRAGMA temp_store = MEMORY',
        'PRAGMA mmap_size = 30000000000',
        'PRAGMA page_size = 4096',
        'PRAGMA cache_size = -64000',
      ];

      for (const pragma of pragmas) {
        try {
          await sequelize.query(pragma);
          console.log(`✅ ${pragma}`);
        } catch (err) {
          console.log(`⚠️  ${pragma}: ${err.message}`);
        }
      }

      console.log('\n📊 Analyzing database for query optimization...\n');
      await sequelize.query('ANALYZE');
      console.log('✅ Database analyzed\n');
    }

    console.log('🎉 Database optimization complete!');
    console.log('\nKey improvements:');
    console.log('✓ Indexes on frequently-queried columns');
    console.log('✓ Optimized SQLite for concurrent access');
    console.log('✓ Cache settings tuned for performance\n');

  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    await createIndexes();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
