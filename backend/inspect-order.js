const { sequelize } = require('./database/database');

async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database.sqlite');
  
  db.all("SELECT id, status, deliveryType FROM Orders WHERE id = 21", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
  });
}

main();
