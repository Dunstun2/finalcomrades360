const { sequelize } = require('./database/database');

async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database.sqlite');
  
  db.run("UPDATE \"Order\" SET status = 'at_warehouse' WHERE id = 21", (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Order 21 status successfully updated to at_warehouse.');
    }
  });
}

main();
