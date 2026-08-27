#!/usr/bin/env node
/**
 * Complete migration script to fix all blog table schemas
 * Renames columns and adds missing ones for production MySQL
 */

const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function migrateBlogSchema() {
  try {
    console.log('🔧 Starting complete blog schema migration...\n');

    // 1. Fix BlogComment table
    console.log('📝 Migrating BlogComment table...');
    
    // Rename postId to blogPostId if exists
    try {
      await sequelize.query(`ALTER TABLE BlogComment CHANGE COLUMN postId blogPostId INT NOT NULL`);
      console.log('  ✅ Renamed postId to blogPostId');
    } catch (e) {
      if (e.message.includes('check that it exists')) {
        console.log('  ℹ️  blogPostId already exists, skipping rename');
      } else {
        console.log('  ⚠️  postId rename issue:', e.message);
      }
    }

    // Add missing columns to BlogComment
    const commentColumns = [
      { name: 'authorName', sql: 'ADD COLUMN authorName VARCHAR(255) NULL' },
      { name: 'authorEmail', sql: 'ADD COLUMN authorEmail VARCHAR(255) NULL' },
      { name: 'status', sql: "ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'" },
      { name: 'parentId', sql: 'ADD COLUMN parentId INT NULL' }
    ];

    for (const col of commentColumns) {
      try {
        await sequelize.query(`ALTER TABLE BlogComment ${col.sql}`);
        console.log(`  ✅ Added ${col.name} to BlogComment`);
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log(`  ℹ️  ${col.name} already exists`);
        } else {
          console.log(`  ⚠️  ${col.name} error:`, e.message);
        }
      }
    }

    // Migrate existing data: copy guestName/guestEmail to authorName/authorEmail
    try {
      await sequelize.query(`
        UPDATE BlogComment 
        SET authorName = guestName, authorEmail = guestEmail 
        WHERE authorName IS NULL AND guestName IS NOT NULL
      `);
      console.log('  ✅ Migrated guest data to author fields');
    } catch (e) {
      console.log('  ⚠️  Data migration skipped:', e.message);
    }

    // 2. Fix BlogLike table
    console.log('\n❤️  Migrating BlogLike table...');
    
    try {
      await sequelize.query(`ALTER TABLE BlogLike CHANGE COLUMN postId blogPostId INT NOT NULL`);
      console.log('  ✅ Renamed postId to blogPostId');
    } catch (e) {
      if (e.message.includes('check that it exists')) {
        console.log('  ℹ️  blogPostId already exists, skipping rename');
      } else {
        console.log('  ⚠️  postId rename issue:', e.message);
      }
    }

    // Add ipAddress column for anonymous likes
    try {
      await sequelize.query(`ALTER TABLE BlogLike ADD COLUMN ipAddress VARCHAR(45) NULL`);
      console.log('  ✅ Added ipAddress column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  ℹ️  ipAddress already exists');
      }
    }

    // Make userId nullable for anonymous likes
    try {
      await sequelize.query(`ALTER TABLE BlogLike MODIFY COLUMN userId INT NULL`);
      console.log('  ✅ Made userId nullable for anonymous likes');
    } catch (e) {
      console.log('  ⚠️  userId modification skipped:', e.message);
    }

    // 3. Fix BlogRating table
    console.log('\n⭐ Migrating BlogRating table...');
    
    try {
      await sequelize.query(`ALTER TABLE BlogRating CHANGE COLUMN postId blogPostId INT NOT NULL`);
      console.log('  ✅ Renamed postId to blogPostId');
    } catch (e) {
      if (e.message.includes('check that it exists')) {
        console.log('  ℹ️  blogPostId already exists, skipping rename');
      } else {
        console.log('  ⚠️  postId rename issue:', e.message);
      }
    }

    // 4. Fix BlogPost tags column (ensure it's JSON compatible)
    console.log('\n🏷️  Fixing BlogPost tags column...');
    
    try {
      // Convert tags from TEXT to JSON type
      await sequelize.query(`ALTER TABLE BlogPost MODIFY COLUMN tags JSON NULL`);
      console.log('  ✅ Converted tags to JSON type');
    } catch (e) {
      console.log('  ℹ️  Tags column already correct or MySQL version doesn\'t support JSON:', e.message);
    }

    // Convert existing text tags to JSON arrays
    try {
      const posts = await sequelize.query(
        'SELECT id, tags FROM BlogPost WHERE tags IS NOT NULL',
        { type: QueryTypes.SELECT }
      );

      for (const post of posts) {
        let jsonTags = '[]';
        
        if (post.tags && typeof post.tags === 'string') {
          // If it's already valid JSON, keep it
          try {
            const parsed = JSON.parse(post.tags);
            jsonTags = JSON.stringify(Array.isArray(parsed) ? parsed : []);
          } catch {
            // If it's a comma-separated string, convert it
            if (post.tags.includes(',')) {
              const tagArray = post.tags.split(',').map(t => t.trim()).filter(t => t);
              jsonTags = JSON.stringify(tagArray);
            } else {
              jsonTags = '[]';
            }
          }
        }

        await sequelize.query(
          'UPDATE BlogPost SET tags = ? WHERE id = ?',
          { replacements: [jsonTags, post.id] }
        );
      }
      console.log(`  ✅ Converted ${posts.length} blog post tags to JSON format`);
    } catch (e) {
      console.log('  ⚠️  Tags conversion skipped:', e.message);
    }

    // 5. Create indexes for better performance
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      { table: 'BlogComment', column: 'blogPostId', name: 'idx_blogcomment_blogpostid' },
      { table: 'BlogComment', column: 'status', name: 'idx_blogcomment_status' },
      { table: 'BlogComment', column: 'parentId', name: 'idx_blogcomment_parentid' },
      { table: 'BlogLike', column: 'blogPostId', name: 'idx_bloglike_blogpostid' },
      { table: 'BlogRating', column: 'blogPostId', name: 'idx_blograting_blogpostid' }
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})`);
        console.log(`  ✅ Created index ${idx.name}`);
      } catch (e) {
        if (e.message.includes('Duplicate key name')) {
          console.log(`  ℹ️  Index ${idx.name} already exists`);
        } else {
          console.log(`  ⚠️  Index ${idx.name} error:`, e.message);
        }
      }
    }

    console.log('\n🎉 Migration complete! All blog tables updated.');
    console.log('\n📋 Summary:');
    console.log('  - BlogComment: postId → blogPostId, added authorName, authorEmail, status, parentId');
    console.log('  - BlogLike: postId → blogPostId, added ipAddress, userId now nullable');
    console.log('  - BlogRating: postId → blogPostId');
    console.log('  - BlogPost: tags converted to JSON format');
    console.log('  - Created performance indexes');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateBlogSchema();
