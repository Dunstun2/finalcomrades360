const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing TeamMember table schema...');

db.serialize(() => {
  // SQLite doesn't support DROP COLUMN, so we recreate the table
  db.run(`
    CREATE TABLE IF NOT EXISTS TeamMember_backup AS SELECT * FROM TeamMember;
  `, (err) => {
    if (err && !err.message.includes('already exists')) throw err;
    console.log('✅ Backed up data');
    
    db.run(`DROP TABLE TeamMember`, (err) => {
      if (err) throw err;
      console.log('✅ Dropped old table');
      
      db.run(`
        CREATE TABLE TeamMember (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          position TEXT NOT NULL,
          description TEXT,
          photo TEXT,
          \`order\` INTEGER DEFAULT 0,
          isActive BOOLEAN DEFAULT 1,
          createdBy TEXT,
          updatedBy TEXT,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        )
      `, (err) => {
        if (err) throw err;
        console.log('✅ Created new table with nullable createdBy');
        
        // Restore data
        db.run(`INSERT INTO TeamMember SELECT * FROM TeamMember_backup`, (err) => {
          if (err) throw err;
          console.log('✅ Restored data');
          
          // Clean up backup
          db.run(`DROP TABLE TeamMember_backup`, (err) => {
            if (err) throw err;
            console.log('✅ Cleaned up backup');
            
            // Recreate indexes
            db.run(`CREATE INDEX idx_TeamMember_isActive ON TeamMember(isActive)`, (err) => {
              if (err && !err.message.includes('already exists')) throw err;
              db.run(`CREATE INDEX idx_TeamMember_order ON TeamMember(\`order\`)`, (err) => {
                if (err && !err.message.includes('already exists')) throw err;
                db.run(`CREATE INDEX idx_TeamMember_createdBy ON TeamMember(createdBy)`, (err) => {
                  if (err && !err.message.includes('already exists')) throw err;
                  console.log('✅ Recreated indexes');
                  
                  db.get(`SELECT COUNT(*) as count FROM TeamMember`, (err, row) => {
                    if (err) throw err;
                    console.log(`\n✨ Schema fixed! Records: ${row.count}`);
                    db.close();
                    process.exit(0);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

db.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
