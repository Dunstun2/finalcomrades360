# Blog Post Creation 500 Error - Production Fix

## Problem
Blog post creation works locally (SQLite) but fails with 500 error in production (MySQL).

## Root Cause
Most likely one of these issues:
1. **BlogPost table doesn't exist in production MySQL database**
2. **Table structure is outdated/missing columns**
3. **Foreign key constraint issue with User table**

## Solution

### Option 1: Run Migration (Recommended)
If you have access to SSH on production server:

```bash
# Navigate to backend directory
cd backend

# Set production environment
export NODE_ENV=production

# Run the blog post migration
npx sequelize-cli db:migrate --migrations-path migrations --config config/config.js
```

### Option 2: Run Sync Script
If migrations don't work, use the sync script:

```bash
# In production server
cd backend

# Set production environment
export NODE_ENV=production

# Run the sync script
node scripts/sync-blog-table-production.js
```

This will:
- Create BlogPost table if it doesn't exist
- Add any missing columns
- Verify the table structure
- Show you the current state

### Option 3: Manual MySQL Query
If you have direct MySQL access, run this:

```sql
USE your_database_name;

CREATE TABLE IF NOT EXISTS `BlogPost` (
  `id` CHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `featuredImage` VARCHAR(500),
  `authorName` VARCHAR(100) NOT NULL,
  `authorAvatar` VARCHAR(500),
  `readingTime` INT DEFAULT 5,
  `summary` TEXT NOT NULL,
  `content` LONGTEXT NOT NULL,
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  `publishedAt` DATETIME,
  `isFeatured` BOOLEAN DEFAULT 0,
  `metaTitle` VARCHAR(255),
  `metaDescription` VARCHAR(500),
  `category` VARCHAR(100),
  `tags` JSON,
  `viewCount` INT DEFAULT 0,
  `createdBy` CHAR(36) NOT NULL,
  `updatedBy` CHAR(36),
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  INDEX `idx_slug` (`slug`),
  INDEX `idx_status` (`status`),
  INDEX `idx_publishedAt` (`publishedAt`),
  INDEX `idx_isFeatured` (`isFeatured`),
  INDEX `idx_category` (`category`),
  INDEX `idx_createdBy` (`createdBy`)
);

-- Create related tables
CREATE TABLE IF NOT EXISTS `BlogComment` (
  `id` CHAR(36) PRIMARY KEY,
  `blogPostId` CHAR(36) NOT NULL,
  `authorName` VARCHAR(100) NOT NULL,
  `authorEmail` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  FOREIGN KEY (`blogPostId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `BlogLike` (
  `id` CHAR(36) PRIMARY KEY,
  `blogPostId` CHAR(36) NOT NULL,
  `userId` CHAR(36),
  `sessionId` VARCHAR(255),
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  FOREIGN KEY (`blogPostId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `BlogRating` (
  `id` CHAR(36) PRIMARY KEY,
  `blogPostId` CHAR(36) NOT NULL,
  `userId` CHAR(36),
  `sessionId` VARCHAR(255),
  `rating` INT NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  FOREIGN KEY (`blogPostId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
);
```

### Option 4: Enable Auto-Sync (Not Recommended for Production)
Only as a last resort, you can temporarily enable auto-sync in production:

In `.env.production`:
```env
DB_SYNC=true
```

Then restart the server. The tables will be created automatically. **Turn this off after the tables are created!**

## Verification

After running any of the above solutions, verify the fix:

```bash
# Test the endpoint
curl -X POST https://comrades360.shop/api/cms/blog \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Post",
    "authorName": "Admin",
    "summary": "Test summary",
    "content": "Test content",
    "status": "draft"
  }'
```

## Changes Made to Code

1. **Enhanced error logging** in `backend/controllers/blogController.js`:
   - Detailed logging for production debugging
   - Specific handling for database table not found errors

2. **Created sync script** `backend/scripts/sync-blog-table-production.js`:
   - Can be run in production to create/update tables

3. **Added test endpoint** `GET /api/cms/blog/test-auth`:
   - Verify authentication is working

## Deployment Steps

1. **Commit the changes**:
   ```bash
   git add .
   git commit -m "Fix: Add production error handling for blog creation"
   git push origin main
   ```

2. **Deploy to production** (cPanel/Git deployment)

3. **Run the sync script** (via SSH or cPanel terminal):
   ```bash
   cd backend
   NODE_ENV=production node scripts/sync-blog-table-production.js
   ```

4. **Verify the fix** by testing blog creation in production

## Prevention

To prevent this in the future:
- Always run migrations after deploying model changes
- Keep a deployment checklist that includes database sync
- Consider adding automated migration runs to your deployment pipeline

## Support

If the issue persists after trying all solutions:
1. Check production server logs for the specific error
2. Verify MySQL connection and permissions
3. Check if User table exists (required for foreign key)
4. Ensure the database user has CREATE TABLE permissions
