'use strict';

/**
 * Safe migration for new inventory/payment enhancement tables only.
 * Idempotent: skips table creation when table already exists.
 */

const TABLES = {
  stockReservations: 'StockReservations',
  stockAuditLogs: 'StockAuditLogs',
  warehouseStocks: 'WarehouseStocks',
  paymentRetryQueues: 'PaymentRetryQueues',
  paymentReconciliations: 'PaymentReconciliations',
  refunds: 'Refunds',
  paymentDisputes: 'PaymentDisputes'
};

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || '')).map((t) => t.toLowerCase());
  return normalized.includes(tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLES.stockReservations))) {
      await queryInterface.createTable(TABLES.stockReservations, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        productId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        quantity: { type: Sequelize.INTEGER, allowNull: false },
        warehouseId: { type: Sequelize.INTEGER, allowNull: true },
        sessionId: { type: Sequelize.STRING, allowNull: true },
        orderId: { type: Sequelize.INTEGER, allowNull: true },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
        expiresAt: { type: Sequelize.DATE, allowNull: false },
        releasedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.stockReservations, ['productId']);
      await queryInterface.addIndex(TABLES.stockReservations, ['userId']);
      await queryInterface.addIndex(TABLES.stockReservations, ['status']);
      await queryInterface.addIndex(TABLES.stockReservations, ['expiresAt']);
    }

    if (!(await tableExists(queryInterface, TABLES.stockAuditLogs))) {
      await queryInterface.createTable(TABLES.stockAuditLogs, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        productId: { type: Sequelize.INTEGER, allowNull: false },
        warehouseId: { type: Sequelize.INTEGER, allowNull: true },
        changeType: { type: Sequelize.STRING, allowNull: false },
        quantityBefore: { type: Sequelize.INTEGER, allowNull: false },
        quantityChange: { type: Sequelize.INTEGER, allowNull: false },
        quantityAfter: { type: Sequelize.INTEGER, allowNull: false },
        orderId: { type: Sequelize.INTEGER, allowNull: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.stockAuditLogs, ['productId']);
      await queryInterface.addIndex(TABLES.stockAuditLogs, ['changeType']);
      await queryInterface.addIndex(TABLES.stockAuditLogs, ['createdAt']);
    }

    if (!(await tableExists(queryInterface, TABLES.warehouseStocks))) {
      await queryInterface.createTable(TABLES.warehouseStocks, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        productId: { type: Sequelize.INTEGER, allowNull: false },
        warehouseId: { type: Sequelize.INTEGER, allowNull: false },
        quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        reserved: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        reorderPoint: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 },
        lastRestockedAt: { type: Sequelize.DATE, allowNull: true },
        lastRestockedBy: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.warehouseStocks, ['productId', 'warehouseId'], { unique: true });
      await queryInterface.addIndex(TABLES.warehouseStocks, ['warehouseId']);
    }

    if (!(await tableExists(queryInterface, TABLES.paymentRetryQueues))) {
      await queryInterface.createTable(TABLES.paymentRetryQueues, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        paymentId: { type: Sequelize.INTEGER, allowNull: false },
        orderId: { type: Sequelize.INTEGER, allowNull: false },
        retryCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        maxRetries: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
        nextRetryAt: { type: Sequelize.DATE, allowNull: false },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
        failureReason: { type: Sequelize.TEXT, allowNull: true },
        lastAttemptAt: { type: Sequelize.DATE, allowNull: true },
        lastAttemptError: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.paymentRetryQueues, ['paymentId']);
      await queryInterface.addIndex(TABLES.paymentRetryQueues, ['status']);
      await queryInterface.addIndex(TABLES.paymentRetryQueues, ['nextRetryAt']);
    }

    if (!(await tableExists(queryInterface, TABLES.paymentReconciliations))) {
      await queryInterface.createTable(TABLES.paymentReconciliations, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        paymentId: { type: Sequelize.INTEGER, allowNull: true },
        orderId: { type: Sequelize.INTEGER, allowNull: true },
        transactionId: { type: Sequelize.STRING, allowNull: false },
        expectedAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        actualAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        discrepancyType: { type: Sequelize.STRING, allowNull: false },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
        notes: { type: Sequelize.TEXT, allowNull: true },
        resolvedBy: { type: Sequelize.INTEGER, allowNull: true },
        resolvedAt: { type: Sequelize.DATE, allowNull: true },
        resolutionAction: { type: Sequelize.STRING, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.paymentReconciliations, ['paymentId']);
      await queryInterface.addIndex(TABLES.paymentReconciliations, ['orderId']);
      await queryInterface.addIndex(TABLES.paymentReconciliations, ['status']);
    }

    if (!(await tableExists(queryInterface, TABLES.refunds))) {
      await queryInterface.createTable(TABLES.refunds, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        paymentId: { type: Sequelize.INTEGER, allowNull: false },
        orderId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        originalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        refundType: { type: Sequelize.STRING, allowNull: false, defaultValue: 'full' },
        reason: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'requested' },
        method: { type: Sequelize.STRING, allowNull: false, defaultValue: 'original_payment_method' },
        externalRefundId: { type: Sequelize.STRING, allowNull: true },
        requestedBy: { type: Sequelize.INTEGER, allowNull: false },
        approvedBy: { type: Sequelize.INTEGER, allowNull: true },
        processedBy: { type: Sequelize.INTEGER, allowNull: true },
        approvedAt: { type: Sequelize.DATE, allowNull: true },
        completedAt: { type: Sequelize.DATE, allowNull: true },
        rejectionReason: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.refunds, ['paymentId']);
      await queryInterface.addIndex(TABLES.refunds, ['orderId']);
      await queryInterface.addIndex(TABLES.refunds, ['status']);
    }

    if (!(await tableExists(queryInterface, TABLES.paymentDisputes))) {
      await queryInterface.createTable(TABLES.paymentDisputes, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        paymentId: { type: Sequelize.INTEGER, allowNull: false },
        orderId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        disputeType: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'open' },
        priority: { type: Sequelize.STRING, allowNull: false, defaultValue: 'medium' },
        assignedTo: { type: Sequelize.INTEGER, allowNull: true },
        resolution: { type: Sequelize.STRING, allowNull: true },
        resolutionNotes: { type: Sequelize.TEXT, allowNull: true },
        resolvedBy: { type: Sequelize.INTEGER, allowNull: true },
        resolvedAt: { type: Sequelize.DATE, allowNull: true },
        evidence: { type: Sequelize.JSON, allowNull: true },
        timeline: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(TABLES.paymentDisputes, ['paymentId']);
      await queryInterface.addIndex(TABLES.paymentDisputes, ['orderId']);
      await queryInterface.addIndex(TABLES.paymentDisputes, ['status']);
    }
  },

  async down(queryInterface) {
    const dropIfExists = async (name) => {
      if (await tableExists(queryInterface, name)) {
        await queryInterface.dropTable(name);
      }
    };

    await dropIfExists(TABLES.paymentDisputes);
    await dropIfExists(TABLES.refunds);
    await dropIfExists(TABLES.paymentReconciliations);
    await dropIfExists(TABLES.paymentRetryQueues);
    await dropIfExists(TABLES.warehouseStocks);
    await dropIfExists(TABLES.stockAuditLogs);
    await dropIfExists(TABLES.stockReservations);
  }
};
