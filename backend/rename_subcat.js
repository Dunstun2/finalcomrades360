const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // Check if Subcategories exists and Subcategory does not
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Subcategories'", (err, row) => {
        if (row) {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Subcategory'", (err2, row2) => {
                if (!row2) {
                    console.log('Renaming Subcategories to Subcategory...');
                    db.run("ALTER TABLE Subcategories RENAME TO Subcategory", (err3) => {
                        if (err3) {
                            console.error('Error renaming table:', err3);
                        } else {
                            console.log('Table renamed successfully.');
                        }
                    });
                } else {
                    console.log('Subcategory table already exists.');
                }
            });
        } else {
            console.log('Subcategories table does not exist.');
        }
    });
});

setTimeout(() => db.close(), 2000);
