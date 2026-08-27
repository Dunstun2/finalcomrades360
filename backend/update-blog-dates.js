#!/usr/bin/env node
/**
 * Update blog post dates to be between Aug 19-22, 2026
 */

const { sequelize } = require('./database/database');
const { QueryTypes } = require('sequelize');

async function updateBlogDates() {
  try {
    console.log('📅 Updating blog post dates...\n');

    // Get all blog posts
    const posts = await sequelize.query(
      'SELECT id, title, publishedAt, createdAt FROM BlogPost ORDER BY createdAt ASC',
      { type: QueryTypes.SELECT }
    );

    if (posts.length === 0) {
      console.log('No blog posts found.');
      process.exit(0);
    }

    console.log(`Found ${posts.length} blog posts to update\n`);

    // Date range: Aug 19, 2026 to Aug 22, 2026
    const startDate = new Date('2026-08-19T08:00:00');
    const endDate = new Date('2026-08-22T20:00:00');
    
    // Distribute posts evenly across the date range
    const timeRange = endDate - startDate;
    const timeIncrement = timeRange / posts.length;

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      
      // Calculate new date for this post
      const newDate = new Date(startDate.getTime() + (timeIncrement * i));
      
      // Format for MySQL: YYYY-MM-DD HH:MM:SS
      const formattedDate = newDate.toISOString().slice(0, 19).replace('T', ' ');

      // Update both publishedAt and createdAt
      await sequelize.query(
        'UPDATE BlogPost SET publishedAt = ?, createdAt = ?, updatedAt = ? WHERE id = ?',
        {
          replacements: [formattedDate, formattedDate, formattedDate, post.id],
          type: QueryTypes.UPDATE
        }
      );

      console.log(`✅ Updated: "${post.title}"`);
      console.log(`   Old date: ${post.publishedAt || post.createdAt}`);
      console.log(`   New date: ${formattedDate}\n`);
    }

    console.log('🎉 All blog post dates updated successfully!');
    console.log(`\nDate range: Aug 19, 2026 - Aug 22, 2026`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating blog dates:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateBlogDates();
