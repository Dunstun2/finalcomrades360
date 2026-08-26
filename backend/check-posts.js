const { sequelize, BlogPost } = require('./database/models.registry');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');
    
    const posts = await BlogPost.findAll({
      attributes: ['id', 'title', 'status', 'slug'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Total posts in database: ${posts.length}\n`);
    
    if (posts.length === 0) {
      console.log('No blog posts found in database!');
    } else {
      console.log('All blog posts:');
      posts.forEach(p => {
        console.log(`  [${p.status.toUpperCase()}] ${p.title}`);
        console.log(`  ID: ${p.id}, Slug: ${p.slug}\n`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
