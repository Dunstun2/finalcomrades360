const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'blockchain', '..', 'database.sqlite');
console.log('Opening DB at:', dbPath);

const db = new sqlite3.Database(dbPath);

const queries = [
    'ALTER TABLE PickupStation ADD COLUMN lat DECIMAL(10, 8)',
    'ALTER TABLE PickupStation ADD COLUMN lng DECIMAL(11, 8)'
];

function runQuery(query) {
    return new Promise((resolve, reject) => {
        db.run(query, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Column already exists for:', query);
                    resolve();
                } else {
                    reject(err);
                }
            } else {
                console.log('Success for:', query);
                resolve();
            }
        });
    });
}

async function start() {
    try {
        for (const q of queries) {
            await runQuery(q);
        }
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        db.close();
    }
}

start();
