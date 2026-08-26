const db = require('../models');

db.sequelize.query('SELECT * FROM TeamMember ORDER BY `order`').then(r => {
  console.log('Total records:', r[0].length);
  r[0].forEach(m => console.log(`- ${m.id.substring(0, 8)}... | ${m.name} | ${m.position}`));
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
