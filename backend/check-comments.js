const { sequelize } = require('./database/database');
const { BlogComment } = require('./database/models.registry');

async function checkComments() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const comments = await BlogComment.findAll({
      attributes: ['id', 'authorName', 'authorEmail', 'content', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true
    });
    
    console.log('\nRecent Comments:');
    console.log(JSON.stringify(comments, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkComments();
