const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');
db.all("PRAGMA foreign_key_list('User');", (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});
