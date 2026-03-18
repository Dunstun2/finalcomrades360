const { sequelize } = require('../database/database');

async function main() {
  const target = [
    'StockReservations',
    'StockAuditLogs',
    'WarehouseStocks',
    'PaymentRetryQueues',
    'PaymentReconciliations',
    'Refunds',
    'PaymentDisputes'
  ];

  const [rows] = await sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${target.map(() => '?').join(',')}) ORDER BY name`,
    { replacements: target }
  );

  console.log('Found tables:', rows.map((r) => r.name).join(', '));
  const missing = target.filter((name) => !rows.some((r) => r.name === name));
  if (missing.length > 0) {
    console.log('Missing tables:', missing.join(', '));
    process.exitCode = 1;
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await sequelize.close(); } catch (_) {}
  process.exit(1);
});
