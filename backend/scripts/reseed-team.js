const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const members = [
  ['550e8400-e29b-41d4-a716-446655440001', 'Sarah Johnson', 'Chief Executive Officer', 'Visionary leader with 15+ years in e-commerce and digital transformation', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 1, 1],
  ['550e8400-e29b-41d4-a716-446655440002', 'Michael Chen', 'Chief Technology Officer', 'Full-stack developer passionate about scalable architecture and innovation', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael', 2, 1],
  ['550e8400-e29b-41d4-a716-446655440003', 'Emma Rodriguez', 'Head of Product', 'Product strategist focused on user experience and market fit', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', 3, 1],
  ['550e8400-e29b-41d4-a716-446655440004', 'David Martinez', 'Lead Backend Engineer', 'Database architect and performance optimization specialist', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 4, 1],
  ['550e8400-e29b-41d4-a716-446655440005', 'Lisa Anderson', 'Head of Marketing', 'Digital marketing expert with proven track record in brand growth', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa', 5, 1],
  ['550e8400-e29b-41d4-a716-446655440006', 'James Wilson', 'UI/UX Designer', 'Creative designer specializing in intuitive user interfaces and design systems', 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', 6, 1],
  ['550e8400-e29b-41d4-a716-446655440007', 'Priya Patel', 'Customer Success Manager', 'Dedicated to building strong relationships and ensuring customer satisfaction', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', 7, 1],
  ['550e8400-e29b-41d4-a716-446655440008', 'Alex Thompson', 'DevOps Engineer', 'Infrastructure and deployment specialist ensuring system reliability', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 8, 1],
];

console.log('🌱 Clearing and reseeding team members...');

db.serialize(() => {
  db.run(`DELETE FROM TeamMember WHERE id LIKE '550e8400%'`, (err) => {
    if (err) throw err;
    console.log('✅ Cleared seeded data');
  });

  const stmt = db.prepare(`INSERT INTO TeamMember (id, name, position, description, photo, \`order\`, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`);
  
  members.forEach(m => {
    stmt.run(m, (err) => {
      if (err) throw err;
      console.log(`✅ Inserted: ${m[1]}`);
    });
  });
  
  stmt.finalize((err) => {
    if (err) throw err;
    
    db.get(`SELECT COUNT(*) as count FROM TeamMember`, (err, row) => {
      if (err) throw err;
      console.log(`\n✨ Total team members: ${row.count}`);
      db.close();
      process.exit(0);
    });
  });
});

db.on('error', (err) => {
  console.error('❌ Database error:', err.message);
  process.exit(1);
});
