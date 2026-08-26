const db = require('../models');

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

db.sequelize.query(`INSERT OR IGNORE INTO TeamMember (id, name, position, description, photo, \`order\`, isActive, createdAt, updatedAt) VALUES 
${members.map(m => `('${m[0]}', '${m[1].replace(/'/g, "''")}', '${m[2].replace(/'/g, "''")}', '${m[3].replace(/'/g, "''")}', '${m[4]}', ${m[5]}, ${m[6]}, datetime('now'), datetime('now'))`).join(', ')}`).then(() => {
  console.log('✅ Seeded 8 team members');
  process.exit(0);
}).catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
