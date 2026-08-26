// Script to verify BlogPost table exists and create it if missing
const { sequelize } = require('../database/database');
const { BlogPost, User } = require('../database/models.registry');

async function verifyBlogTable() {
  try {
    console.log('🔍 Checking if BlogPost table exists...');
    
    // Test if table exists by trying to describe it
    const tableDescription = await sequelize.getQueryInterface().describeTable('BlogPost');
    
    console.log('✅ BlogPost table exists with columns:', Object.keys(tableDescription));
    
    // Test if we can query the table
    const count = await BlogPost.count();
    console.log(`✅ BlogPost table accessible, contains ${count} posts`);
    
    // Test if User table exists (for foreign key)
    const userTableDescription = await sequelize.getQueryInterface().describeTable('User');
    console.log('✅ User table exists (required for foreign key)');
    
    // Try creating a test post (with a test user)
    const testUser = await User.findOne();
    if (!testUser) {
      console.warn('⚠️  No users found in database. Cannot fully test blog creation.');
      console.log('Please create an admin user first.');
    } else {
      console.log('✅ Test user found:', testUser.email);
      console.log('BlogPost table is ready for use!');
    }
    
  } catch (error) {
    console.error('❌ Error verifying BlogPost table:', error.message);
    
    if (error.message.includes('no such table') || error.message.includes('doesn\'t exist')) {
      console.log('\n📝 Table does not exist. Creating it now...');
      
      try {
        // Sync the BlogPost model to create the table
        await BlogPost.sync({ force: false });
        console.log('✅ BlogPost table created successfully!');
        
        // Verify it was created
        const tableDescription = await sequelize.getQueryInterface().describeTable('BlogPost');
        console.log('✅ Table columns:', Object.keys(tableDescription));
        
      } catch (syncError) {
        console.error('❌ Failed to create table:', syncError.message);
        console.log('\nTry running the migration manually:');
        console.log('  npx sequelize-cli db:migrate');
      }
    } else {
      console.log('\n⚠️  Unexpected error. Full details:', error);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the verification
verifyBlogTable();
