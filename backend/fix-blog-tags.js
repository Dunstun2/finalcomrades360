#!/usr/bin/env node
/**
 * Fix blog post tags data type issue
 * Converts string tags to JSON arrays for MySQL compatibility
 */

const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function fixBlogTags() {
  try {
    console.log('🔧 Starting blog tags fix...');

    // Get all blog posts
    const posts = await sequelize.query(
      'SELECT id, title, tags FROM BlogPost',
      { type: QueryTypes.SELECT }
    );

    console.log(`📊 Found ${posts.length} blog posts to check`);

    let fixedCount = 0;

    for (const post of posts) {
      let needsFix = false;
      let newTags = '[]';

      // Check if tags is NULL
      if (post.tags === null) {
        needsFix = true;
        newTags = '[]';
      }
      // Check if tags is empty string
      else if (post.tags === '' || post.tags === '""') {
        needsFix = true;
        newTags = '[]';
      }
      // Check if tags is a string (not valid JSON array)
      else if (typeof post.tags === 'string') {
        try {
          const parsed = JSON.parse(post.tags);
          // If it parsed but it's not an array, fix it
          if (!Array.isArray(parsed)) {
            needsFix = true;
            newTags = '[]';
          }
        } catch (e) {
          // Invalid JSON, needs fixing
          needsFix = true;
          // Try to salvage comma-separated tags
          if (post.tags.includes(',')) {
            const tagArray = post.tags.split(',').map(t => t.trim()).filter(t => t);
            newTags = JSON.stringify(tagArray);
          } else {
            newTags = '[]';
          }
        }
      }

      if (needsFix) {
        await sequelize.query(
          'UPDATE BlogPost SET tags = :tags WHERE id = :id',
          {
            replacements: { tags: newTags, id: post.id },
            type: QueryTypes.UPDATE
          }
        );
        console.log(`✅ Fixed tags for post: "${post.title}" (id: ${post.id})`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 Complete! Fixed ${fixedCount} blog posts`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing blog tags:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix
fixBlogTags();
