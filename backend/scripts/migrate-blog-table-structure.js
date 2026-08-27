// Script to migrate BlogPost table from old structure to new structure
const { sequelize } = require('../database/database');

async function migrateBlogTable() {
  try {
    console.log('🔄 Migrating BlogPost table structure...');
    
    // Check current structure
    const [currentColumns] = await sequelize.query('DESCRIBE BlogPost');
    const columnNames = currentColumns.map(c => c.Field);
    
    console.log('\n📋 Current columns:', columnNames.join(', '));
    
    // Backup existing data
    const [existingPosts] = await sequelize.query('SELECT COUNT(*) as count FROM BlogPost');
    console.log(`\n📊 Found ${existingPosts[0].count} existing blog posts`);
    
    if (existingPosts[0].count > 0) {
      console.log('⚠️  WARNING: Table has existing data!');
      console.log('Creating backup table...');
      
      await sequelize.query('CREATE TABLE IF NOT EXISTS BlogPost_Backup AS SELECT * FROM BlogPost');
      console.log('✅ Backup created: BlogPost_Backup');
    }
    
    // Add new columns if they don't exist
    const alterations = [];
    
    if (!columnNames.includes('authorName')) {
      alterations.push({
        name: 'authorName',
        sql: `ALTER TABLE BlogPost ADD COLUMN authorName VARCHAR(100) NULL AFTER featuredImage`
      });
    }
    
    if (!columnNames.includes('authorAvatar')) {
      alterations.push({
        name: 'authorAvatar',
        sql: `ALTER TABLE BlogPost ADD COLUMN authorAvatar VARCHAR(500) NULL AFTER authorName`
      });
    }
    
    if (!columnNames.includes('readingTime')) {
      alterations.push({
        name: 'readingTime',
        sql: `ALTER TABLE BlogPost ADD COLUMN readingTime INT DEFAULT 5 AFTER authorAvatar`
      });
    }
    
    if (!columnNames.includes('summary')) {
      alterations.push({
        name: 'summary',
        sql: `ALTER TABLE BlogPost ADD COLUMN summary TEXT NULL AFTER readingTime`
      });
    }
    
    if (!columnNames.includes('isFeatured')) {
      alterations.push({
        name: 'isFeatured',
        sql: `ALTER TABLE BlogPost ADD COLUMN isFeatured BOOLEAN DEFAULT 0 AFTER publishedAt`
      });
    }
    
    if (!columnNames.includes('category') && columnNames.includes('categoryId')) {
      alterations.push({
        name: 'category',
        sql: `ALTER TABLE BlogPost ADD COLUMN category VARCHAR(100) NULL AFTER isFeatured`
      });
    }
    
    // Execute alterations
    console.log('\n🔧 Applying alterations...');
    for (const alt of alterations) {
      try {
        await sequelize.query(alt.sql);
        console.log(`  ✅ Added column: ${alt.name}`);
      } catch (err) {
        if (err.message.includes('Duplicate column')) {
          console.log(`  ℹ️  Column ${alt.name} already exists`);
        } else {
          console.error(`  ❌ Failed to add ${alt.name}:`, err.message);
        }
      }
    }
    
    // Migrate data from old columns to new ones
    if (existingPosts[0].count > 0) {
      console.log('\n🔄 Migrating existing data...');
      
      // Copy excerpt to summary
      if (columnNames.includes('excerpt') && alterations.some(a => a.name === 'summary')) {
        await sequelize.query('UPDATE BlogPost SET summary = excerpt WHERE summary IS NULL');
        console.log('  ✅ Copied excerpt → summary');
      }
      
      // Set default authorName for existing posts
      if (alterations.some(a => a.name === 'authorName')) {
        await sequelize.query("UPDATE BlogPost SET authorName = 'Admin' WHERE authorName IS NULL");
        console.log('  ✅ Set default authorName');
      }
      
      // Set default readingTime
      if (alterations.some(a => a.name === 'readingTime')) {
        await sequelize.query('UPDATE BlogPost SET readingTime = readTime WHERE readingTime IS NULL AND readTime IS NOT NULL');
        console.log('  ✅ Copied readTime → readingTime');
      }
    }
    
    // Show final structure
    const [newColumns] = await sequelize.query('DESCRIBE BlogPost');
    console.log('\n✅ Migration complete! New structure:');
    newColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n⚠️  NOTE: Old columns (authorId, categoryId, excerpt) are still present but not used.');
    console.log('You can safely drop them after verifying everything works:');
    console.log('  ALTER TABLE BlogPost DROP COLUMN authorId;');
    console.log('  ALTER TABLE BlogPost DROP COLUMN categoryId;');
    console.log('  ALTER TABLE BlogPost DROP COLUMN excerpt;');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrateBlogTable();
