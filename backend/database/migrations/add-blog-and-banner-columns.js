'use strict';

/**
 * Migration: add-blog-and-banner-columns
 *
 * Adds all columns that exist in the current codebase but may be absent in the
 * production MySQL database for:
 *   1. HeroPromotions  – new fields added since the table was first created
 *   2. BlogPost        – full table create (idempotent) + new columns
 *   3. BlogComment     – full table create (idempotent)
 *   4. BlogLike        – full table create (idempotent)
 *   5. BlogRating      – full table create (idempotent)
 *
 * SAFE TO RE-RUN: every ADD COLUMN is guarded by a SHOW COLUMNS check, and
 * every CREATE TABLE uses IF NOT EXISTS.
 */

// ─── helpers ───────────────────────────────────────────────────────────────────

/** Returns true when column already exists in the given table */
async function columnExists(queryInterface, table, column) {
  try {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch {
    return false; // table itself doesn't exist yet → column can't exist either
  }
}

/** Returns true when the table exists */
async function tableExists(queryInterface, table) {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch {
    return false;
  }
}

/** Adds a column only when it is absent (idempotent) */
async function addColumnIfMissing(queryInterface, table, column, definition) {
  if (!(await columnExists(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, definition);
    console.log(`  ✅  Added ${table}.${column}`);
  } else {
    console.log(`  ⏭   ${table}.${column} already exists – skipped`);
  }
}

// ─── up ────────────────────────────────────────────────────────────────────────

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ────────────────────────────────────────────────────────────────────────────
    // 1. HeroPromotions – add columns introduced after the initial table creation
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n📦 [HeroPromotions] Checking for missing columns…');

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'fastFoodIds', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON array of fast-food item IDs'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'promoType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'product',
      comment: "'product' or 'fastfood'"
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'title', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'subtitle', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'customImageUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'targetUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'ctaText', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'eyebrow', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'isSystem', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'isDefault', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Marks this banner as a permanent fallback default'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'fallbackLocation', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON array – pages this banner falls back to when no others are active'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'priority', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'trustPoints', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of {icon, text} objects (max 3)'
    });

    // ─── Video fields ───────────────────────────────────────────────────────────
    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'videoUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'URL to video file or YouTube/Vimeo embed'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'videoType', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'background',
      comment: "'background' | 'overlay' | 'embed'"
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'videoAutoplay', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'videoLoop', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'videoMuted', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'mediaMode', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'image',
      comment: "'image' | 'video'"
    });

    // ─── Advanced scheduling fields ─────────────────────────────────────────────
    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'scheduleType', {
      type: Sequelize.STRING,
      defaultValue: 'continuous',
      comment: "'continuous' | 'recurring' | 'specific_dates'"
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'recurringDays', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of weekday numbers [0-6]'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'specificDates', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of date strings ["YYYY-MM-DD", …]'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'timeSlotStart', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Show-from time e.g. "09:00"'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'timeSlotEnd', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Show-until time e.g. "17:00"'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'timezone', {
      type: Sequelize.STRING,
      defaultValue: 'Africa/Nairobi'
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'dateTimeMode', {
      type: Sequelize.STRING,
      defaultValue: 'same',
      comment: "'same' | 'different'"
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'dateSpecificTimes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON object keyed by date with per-date start/end times'
    });

    // ─── Analytics counters ─────────────────────────────────────────────────────
    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'impressions', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await addColumnIfMissing(queryInterface, 'HeroPromotions', 'clicks', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    // ────────────────────────────────────────────────────────────────────────────
    // 2. BlogPost table
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n📦 [BlogPost] Checking table…');

    if (!(await tableExists(queryInterface, 'BlogPost'))) {
      console.log('  🆕 Creating BlogPost table…');
      await queryInterface.createTable('BlogPost', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        title: { type: Sequelize.STRING(255), allowNull: false },
        slug: { type: Sequelize.STRING(255), allowNull: false, unique: true },
        featuredImage: { type: Sequelize.STRING(500), allowNull: true },
        authorName: { type: Sequelize.STRING(100), allowNull: false },
        authorAvatar: { type: Sequelize.STRING(500), allowNull: true },
        readingTime: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 },
        summary: { type: Sequelize.TEXT, allowNull: false },
        content: { type: Sequelize.TEXT('long'), allowNull: false },
        status: {
          type: Sequelize.ENUM('draft', 'published', 'archived'),
          defaultValue: 'draft'
        },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isFeatured: { type: Sequelize.BOOLEAN, defaultValue: false },
        metaTitle: { type: Sequelize.STRING(255), allowNull: true },
        metaDescription: { type: Sequelize.STRING(500), allowNull: true },
        category: { type: Sequelize.STRING(100), allowNull: true },
        tags: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
        viewCount: { type: Sequelize.INTEGER, defaultValue: 0 },
        createdBy: { type: Sequelize.INTEGER, allowNull: false },
        updatedBy: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      console.log('  ✅ BlogPost table created');
    } else {
      console.log('  ✅ BlogPost already exists – checking for missing columns…');
      await addColumnIfMissing(queryInterface, 'BlogPost', 'authorAvatar', { type: Sequelize.STRING(500), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'readingTime', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'summary', { type: Sequelize.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'isFeatured', { type: Sequelize.BOOLEAN, defaultValue: false });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'metaTitle', { type: Sequelize.STRING(255), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'metaDescription', { type: Sequelize.STRING(500), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'category', { type: Sequelize.STRING(100), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'tags', { type: Sequelize.JSON, allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'viewCount', { type: Sequelize.INTEGER, defaultValue: 0 });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'createdBy', { type: Sequelize.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogPost', 'updatedBy', { type: Sequelize.INTEGER, allowNull: true });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 3. BlogComment table
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n📦 [BlogComment] Checking table…');

    if (!(await tableExists(queryInterface, 'BlogComment'))) {
      console.log('  🆕 Creating BlogComment table…');
      await queryInterface.createTable('BlogComment', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        blogPostId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        authorName: { type: Sequelize.STRING(100), allowNull: false },
        authorEmail: { type: Sequelize.STRING(255), allowNull: true },
        content: { type: Sequelize.TEXT, allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'spam'),
          defaultValue: 'approved'
        },
        parentId: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      console.log('  ✅ BlogComment table created');
    } else {
      console.log('  ✅ BlogComment already exists – checking for missing columns…');
      await addColumnIfMissing(queryInterface, 'BlogComment', 'authorEmail', { type: Sequelize.STRING(255), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogComment', 'parentId', { type: Sequelize.INTEGER, allowNull: true });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 4. BlogLike table
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n📦 [BlogLike] Checking table…');

    if (!(await tableExists(queryInterface, 'BlogLike'))) {
      console.log('  🆕 Creating BlogLike table…');
      await queryInterface.createTable('BlogLike', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        blogPostId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        userAgent: { type: Sequelize.STRING(500), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      console.log('  ✅ BlogLike table created');
    } else {
      console.log('  ✅ BlogLike already exists – checking for missing columns…');
      await addColumnIfMissing(queryInterface, 'BlogLike', 'ipAddress', { type: Sequelize.STRING(45), allowNull: true });
      await addColumnIfMissing(queryInterface, 'BlogLike', 'userAgent', { type: Sequelize.STRING(500), allowNull: true });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 5. BlogRating table
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n📦 [BlogRating] Checking table…');

    if (!(await tableExists(queryInterface, 'BlogRating'))) {
      console.log('  🆕 Creating BlogRating table…');
      await queryInterface.createTable('BlogRating', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        blogPostId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        rating: { type: Sequelize.INTEGER, allowNull: false },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      console.log('  ✅ BlogRating table created');
    } else {
      console.log('  ✅ BlogRating already exists – checking for missing columns…');
      await addColumnIfMissing(queryInterface, 'BlogRating', 'ipAddress', { type: Sequelize.STRING(45), allowNull: true });
    }

    console.log('\n🎉 Migration complete!\n');
  },

  // ─── down ──────────────────────────────────────────────────────────────────

  down: async (queryInterface, Sequelize) => {
    // ─── HeroPromotions – remove all added columns ───────────────────────────
    const heroCols = [
      'fastFoodIds', 'promoType', 'title', 'subtitle', 'customImageUrl',
      'targetUrl', 'ctaText', 'eyebrow', 'isSystem', 'isDefault',
      'fallbackLocation', 'priority', 'trustPoints',
      'videoUrl', 'videoType', 'videoAutoplay', 'videoLoop', 'videoMuted', 'mediaMode',
      'scheduleType', 'recurringDays', 'specificDates', 'timeSlotStart', 'timeSlotEnd',
      'timezone', 'dateTimeMode', 'dateSpecificTimes',
      'impressions', 'clicks'
    ];
    for (const col of heroCols) {
      try {
        await queryInterface.removeColumn('HeroPromotions', col);
      } catch { /* already absent */ }
    }

    // ─── Blog tables ─────────────────────────────────────────────────────────
    // Only drop them if you are sure they were created by this migration.
    // Uncomment the lines below if you need to roll back completely:
    //
    // await queryInterface.dropTable('BlogRating');
    // await queryInterface.dropTable('BlogLike');
    // await queryInterface.dropTable('BlogComment');
    // await queryInterface.dropTable('BlogPost');
  }
};
