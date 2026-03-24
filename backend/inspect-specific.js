const { sequelize } = require('./database/database');

async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database.sqlite');
  
  db.get("SELECT id, status, deliveryType, orderNumber FROM \"Order\" WHERE orderNumber = 'ORD-1774097009430-703'", (err, row) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(row, null, 2));
      
      // Let's also check delivery tasks for this order
      if (row) {
        db.all("SELECT id, type, deliveryType, status FROM DeliveryTask WHERE orderId = ?", [row.id], (err2, tasks) => {
          console.log("Tasks:", JSON.stringify(tasks, null, 2));
        });
      }
    }
  });
}

main();
