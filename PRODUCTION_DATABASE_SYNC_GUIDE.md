# Production Database Sync Guide

Complete guide to sync your production database with the latest model structures.

## Overview

Your production database uses **INTEGER IDs** while local dev uses **UUIDs**. The Blog models have been updated to support both, but other tables may need syncing.

## Pre-Sync Checklist

### 1. Backup Your Database
```bash
# SSH into production
ssh vdranjxy@sbg106

# Create backup
mysqldump -u your_username -p vdranjxy_Comradesdb > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Check Current Schema Differences (DRY RUN)
```bash
cd ~/comrades-master
NODE_ENV=production node scripts/check-production-schema-diff.js
```

This will show you:
- ❌ Missing tables
- ⚠️  Missing columns in existing tables
- ℹ️  Extra columns not in models
- ℹ️  Extra tables without models

**Review the output carefully before proceeding!**

## Sync Options

### Option 1: Full Automated Sync (Recommended)

This syncs ALL tables automatically:

```bash
cd ~/comrades-master
NODE_ENV=production node scripts/sync-all-production-tables.js
```

**What it does:**
- ✅ Creates missing tables
- ✅ Adds missing columns
- ✅ Updates indexes
- ✅ Preserves existing data
- ❌ Does NOT drop tables
- ❌ Does NOT delete columns
- ❌ Does NOT delete data

**Expected output:**
```
📊 SYNC SUMMARY REPORT

Total models processed: 85
✅ Successful syncs: 83
❌ Errors: 2

📝 CREATED TABLES (5):
  - NewTable1
  - NewTable2
  
🔧 UPDATED TABLES (25):
  - BlogPost
      added: authorName, summary, isFeatured
  - Product
      added: newColumn
      
✓ UNCHANGED TABLES (53)
```

### Option 2: Blog Tables Only

If you only want to fix the blog issue:

```bash
cd ~/comrades-master
NODE_ENV=production node scripts/migrate-blog-table-structure.js
```

### Option 3: Manual Selective Sync

Sync specific models:

```bash
cd ~/comrades-master
NODE_ENV=production node -e "
const { BlogPost, BlogComment, BlogLike, BlogRating } = require('./database/models.registry');
(async () => {
  await BlogPost.sync({ alter: true });
  await BlogComment.sync({ alter: true });
  await BlogLike.sync({ alter: true });
  await BlogRating.sync({ alter: true });
  console.log('✅ Blog tables synced');
  process.exit(0);
})();
"
```

## Step-by-Step Deployment Process

### Step 1: Deploy Code Changes

```bash
# On production server
cd /home/vdranjxy/production/finalcomrades360
git pull origin main

# Copy to runtime directory
/bin/cp -rf backend/* /home/vdranjxy/comrades-master/
```

### Step 2: Check Schema Differences

```bash
cd ~/comrades-master
NODE_ENV=production node scripts/check-production-schema-diff.js > ~/schema-diff-report.txt
cat ~/schema-diff-report.txt
```

### Step 3: Run Database Sync

```bash
cd ~/comrades-master
NODE_ENV=production node scripts/sync-all-production-tables.js | tee ~/sync-report.txt
```

The `tee` command saves output to a file while showing it on screen.

### Step 4: Verify Changes

```bash
# Check if BlogPost table has new columns
NODE_ENV=production node -e "
const { sequelize } = require('./database/database');
(async () => {
  const [cols] = await sequelize.query('DESCRIBE BlogPost');
  console.log('BlogPost columns:');
  cols.forEach(c => console.log(\`  - \${c.Field}: \${c.Type}\`));
  await sequelize.close();
})();
"
```

### Step 5: Test Blog Creation

Try creating a blog post through your admin panel or via API:

```bash
curl -X POST https://comrades360.shop/api/cms/blog \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Post After Sync",
    "authorName": "Admin",
    "summary": "Testing after database sync",
    "content": "<p>This is a test post</p>",
    "status": "draft"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Blog post created successfully",
  "post": { ... }
}
```

### Step 6: Restart Application

```bash
# If using PM2
pm2 restart all

# If using Passenger (cPanel)
touch ~/comrades-master/tmp/restart.txt

# If using systemd
sudo systemctl restart comrades-app
```

## Troubleshooting

### Issue: "Access denied for user"

**Problem:** Database credentials not loaded

**Solution:**
```bash
# Check .env.production exists
ls -la ~/comrades-master/.env.production

# Verify it has correct values
cat ~/comrades-master/.env.production | grep DB_
```

Should show:
```
DB_USER=vdranjxy_comrades
DB_PASS=your_password
DB_NAME=vdranjxy_Comradesdb
DB_HOST=localhost
```

### Issue: "Column already exists"

**Problem:** Column was manually added or script ran multiple times

**Solution:** This is safe to ignore. The script skips existing columns.

### Issue: "Foreign key constraint fails"

**Problem:** Referenced table/column doesn't exist

**Solution:**
1. Check which table is referenced in error
2. Sync that table first
3. Then sync the table with foreign key

```bash
# Example: If BlogPost references User
NODE_ENV=production node -e "
const { User } = require('./database/models.registry');
(async () => {
  await User.sync({ alter: true });
  console.log('✅ User table synced');
  process.exit(0);
})();
"
```

### Issue: Sync fails for specific table

**Problem:** Table has complex constraints or data issues

**Solution:** Sync manually with SQL:

```sql
-- Example for adding a column
ALTER TABLE BlogPost ADD COLUMN authorName VARCHAR(100) NULL;
ALTER TABLE BlogPost ADD COLUMN summary TEXT NULL;
ALTER TABLE BlogPost ADD COLUMN isFeatured BOOLEAN DEFAULT 0;
```

### Issue: "Table doesn't exist" after sync

**Problem:** Sync didn't create table (permissions?)

**Solution:** Create manually:
```bash
NODE_ENV=production npx sequelize-cli db:migrate
```

## Verification Checklist

After sync, verify:

- [ ] All critical tables exist (User, Product, Order, BlogPost)
- [ ] Blog creation works without 500 error
- [ ] Existing data is intact (check record counts)
- [ ] Application starts without errors
- [ ] No database connection errors in logs
- [ ] Foreign key relationships work
- [ ] Can create, read, update records

```bash
# Quick verification script
cd ~/comrades-master
NODE_ENV=production node scripts/check-production-tables.js
```

## Rollback Plan

If something goes wrong:

### 1. Stop the application
```bash
pm2 stop all
```

### 2. Restore database backup
```bash
mysql -u your_username -p vdranjxy_Comradesdb < ~/backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### 3. Revert code
```bash
cd /home/vdranjxy/production/finalcomrades360
git reset --hard HEAD~1
git pull origin main
```

### 4. Restart application
```bash
pm2 start all
```

## Best Practices

1. **Always backup before syncing**
2. **Run dry-run check first** (`check-production-schema-diff.js`)
3. **Sync during low-traffic hours**
4. **Test in staging first** if you have a staging environment
5. **Monitor logs** after deployment
6. **Keep sync reports** for documentation

## Support

If you encounter issues:

1. Check `~/comrades-master/error.log`
2. Check sync report: `~/sync-report.txt`
3. Verify database credentials
4. Check database user permissions
5. Review the error messages carefully

## Additional Scripts

All database scripts are in `~/comrades-master/scripts/`:

- `check-production-tables.js` - List all tables and verify critical ones
- `check-production-schema-diff.js` - DRY RUN to show differences
- `sync-all-production-tables.js` - Full sync all tables
- `migrate-blog-table-structure.js` - Blog tables only
- `verify-blog-table.js` - Verify BlogPost table structure

Run any script with:
```bash
NODE_ENV=production node scripts/SCRIPT_NAME.js
```
