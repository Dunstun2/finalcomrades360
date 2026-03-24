/**
 * Remove 'customer' from the Roles table (it's now implied, not stored)
 */
const sqlite3 = require('./node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) { console.error('DB open error:', err.message); process.exit(1); }
});

db.serialize(() => {
  db.run("DELETE FROM Roles WHERE id = 'customer'", function(err) {
    if (err) { console.error('Delete error:', err.message); }
    else { console.log('Deleted customer role. Changes:', this.changes); }
  });
  db.all('SELECT id, name FROM Roles ORDER BY id', [], (err, rows) => {
    if (err) { console.error(err.message); }
    else { console.log('Remaining roles:', JSON.stringify(rows, null, 2)); }
    db.close();
  });
});
