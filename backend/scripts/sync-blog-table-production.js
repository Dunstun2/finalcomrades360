// Script to sync BlogPost table in production MySQL database
const { sequelize } = require('../database/database');
const { BlogPost, BlogComment, BlogLike, BlogRating } = require('../database/models.registry');

async function syncBlogTables() {
  try {
    console.log('🔄 Syncing Blog-related tables to production database...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database:', sequelize.options.dialect);
    
    // Sync BlogPost table
    await BlogPost.sync({ alter: true });
    console.log('✅ BlogPost table synced');
    
    // Sync related tables
    await BlogComment.sync({ alter: true });
    console.log('✅ BlogComment table synced');
    
    await BlogLike.sync({ alter: true });
    console.log('✅ BlogLike table synced');
    
    await BlogRating.sync({ alter: true });
    console.log('✅ BlogRating table synced');
    
    // Verify tables exist
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'BlogPost'");
    if (tables.length > 0) {
      console.log('✅ BlogPost table verified in database');
      
      // Show table structure
      const [columns] = await sequelize.query("DESCRIBE BlogPost");
      console.log('\n📋 BlogPost table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
    } else {
      console.error('❌ BlogPost table not found after sync!');
    }
    
    console.log('\n✅ All blog tables synced successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing blog tables:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

syncBlogTables();
