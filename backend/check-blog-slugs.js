const { sequelize } = require('./database/database');
const { BlogPost } = require('./database/models.registry');

async function checkBlogSlugs() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const posts = await BlogPost.findAll({
      attributes: ['id', 'title', 'slug', 'status'],
      raw: true
    });
    
    console.log('\nBlog Posts:');
    console.log(JSON.stringify(posts, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBlogSlugs();
