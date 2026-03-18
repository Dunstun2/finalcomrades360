const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(databasePath);

const createTableSql = `
  CREATE TABLE IF NOT EXISTS FastFoodPickupPoint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contactName VARCHAR(255),
    contactPhone VARCHAR(255) NOT NULL,
    deliveryFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const addDeliveryFeeColumnSql = `
  ALTER TABLE FastFoodPickupPoint
  ADD COLUMN deliveryFee DECIMAL(10,2) NOT NULL DEFAULT 0
`;

db.serialize(() => {
  db.run(createTableSql, (error) => {
    if (error) {
      console.error('Failed to create FastFoodPickupPoint table:', error.message);
      process.exitCode = 1;
      db.close();
      return;
    }

    db.all(
      "PRAGMA table_info(FastFoodPickupPoint)",
      (queryError, columns) => {
        if (queryError) {
          console.error('Failed to inspect FastFoodPickupPoint table:', queryError.message);
          process.exitCode = 1;
          db.close();
          return;
        }

        const hasDeliveryFee = Array.isArray(columns) && columns.some((column) => column.name === 'deliveryFee');
        if (hasDeliveryFee) {
          console.log('FastFoodPickupPoint table ready.');
          console.log(JSON.stringify([{ name: 'FastFoodPickupPoint', deliveryFee: true }]));
          db.close();
          return;
        }

        db.run(addDeliveryFeeColumnSql, (alterError) => {
          if (alterError) {
            console.error('Failed to add deliveryFee column:', alterError.message);
            process.exitCode = 1;
          } else {
            console.log('Added deliveryFee column to FastFoodPickupPoint table.');
            console.log(JSON.stringify([{ name: 'FastFoodPickupPoint', deliveryFee: true }]));
          }

          db.close();
        });
      }
    );
  });
});