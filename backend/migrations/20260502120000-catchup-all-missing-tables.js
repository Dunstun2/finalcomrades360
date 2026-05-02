'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. AdminAuditLog
    await queryInterface.createTable('AdminAuditLog', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      adminId: { type: Sequelize.INTEGER, allowNull: false },
      adminName: { type: Sequelize.STRING, allowNull: true },
      action: { type: Sequelize.STRING, allowNull: false },
      targetType: { type: Sequelize.STRING, allowNull: true },
      targetId: { type: Sequelize.STRING, allowNull: true },
      targetName: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.JSON, allowNull: true },
      ip: { type: Sequelize.STRING, allowNull: true },
      userAgent: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 2. BlockedIP
    await queryInterface.createTable('BlockedIP', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ipAddress: { type: Sequelize.STRING, allowNull: false, unique: true },
      reason: { type: Sequelize.STRING, allowNull: true },
      blockedBy: { type: Sequelize.INTEGER, allowNull: true },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 3. VerifiedContact
    await queryInterface.createTable('VerifiedContacts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      phone: { type: Sequelize.STRING, allowNull: false, unique: true },
      verifiedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 4. PlatformWallets
    await queryInterface.createTable('PlatformWallets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      balance: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      totalEarned: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      totalWithdrawn: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 5. PlatformTransactions
    await queryInterface.createTable('PlatformTransactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      walletId: { type: Sequelize.INTEGER, allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
      sourceType: { type: Sequelize.STRING, allowNull: false },
      referenceId: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 6. Missing Columns Check
    try {
      const platformConfigTable = await queryInterface.describeTable('PlatformConfig');
      if (!platformConfigTable.returnPeriod) {
        await queryInterface.addColumn('PlatformConfig', 'returnPeriod', {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: { days: 7, hours: 0 }
        });
      }
    } catch (e) { console.error('Migration skipped for PlatformConfig:', e.message); }

    try {
      const transactionTable = await queryInterface.describeTable('Transaction');
      if (!transactionTable.walletType) {
        await queryInterface.addColumn('Transaction', 'walletType', {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: null
        });
      }
    } catch (e) { console.error('Migration skipped for Transaction:', e.message); }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PlatformTransactions');
    await queryInterface.dropTable('PlatformWallets');
    await queryInterface.dropTable('VerifiedContacts');
    await queryInterface.dropTable('BlockedIP');
    await queryInterface.dropTable('AdminAuditLog');
  }
};
