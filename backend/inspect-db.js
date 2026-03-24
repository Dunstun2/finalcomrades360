const { sequelize, HandoverCode } = require('./database/database');

async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database.sqlite');
  
  db.all("SELECT * FROM HandoverCode WHERE orderId = 21 ORDER BY createdAt DESC LIMIT 5", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
  });
}

main();
