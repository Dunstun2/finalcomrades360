# Production Deployment Commands

## Server Details
- **User:** vdranjxy
- **Server:** sbg106
- **Backend Path:** `~/comrades-master/backend`

## Step-by-Step Fix for Blog Creation 500 Error

### Step 1: SSH into Production Server
```bash
ssh vdranjxy@sbg106
```

### Step 2: Navigate to Backend Directory
```bash
cd ~/comrades-master/backend
```

### Step 3: Pull Latest Changes from GitHub
```bash
cd ~/comrades-master
git pull origin main
cd backend
```

### Step 4: Check Current Database Tables
```bash
NODE_ENV=production node scripts/check-production-tables.js
```

This will show you:
- All tables in your MySQL database
- Whether BlogPost table exists
- If User table exists (required for foreign keys)

### Step 5: Sync Blog Tables to Production
```bash
NODE_ENV=production node scripts/sync-blog-table-production.js
```

This will:
- Create BlogPost table if missing
- Create BlogComment, BlogLike, BlogRating tables
- Add any missing columns
- Show the final table structure

### Step 6: Restart the Application
```bash
cd ~/comrades-master/backend

# If using PM2
pm2 restart all

# OR if using Passenger (cPanel)
touch ~/comrades-master/backend/tmp/restart.txt

# OR if using systemd
sudo systemctl restart comrades-app
```

### Step 7: Verify the Fix
Test the blog creation endpoint:

```bash
# Replace YOUR_ADMIN_TOKEN with your actual JWT token
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

Expected response:
```json
{
  "success": true,
  "message": "Blog post created successfully",
  "post": { ... }
}
```

### Troubleshooting

#### If check-production-tables.js shows "Cannot connect to database"
Check your `.env.production` file has correct credentials:
```bash
cd ~/comrades-master
cat .env.production | grep DB_
```

Should show:
```
DB_USER=your_username
DB_PASS=your_password
DB_NAME=your_database
DB_HOST=localhost
```

#### If sync script fails with "permission denied"
Your MySQL user needs CREATE TABLE permission:
```sql
GRANT CREATE, ALTER ON your_database.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### If "User table doesn't exist"
You have a bigger issue - the entire database needs initialization. Run:
```bash
NODE_ENV=production npx sequelize-cli db:migrate
```

#### View detailed error logs
```bash
# Check application logs
cd ~/comrades-master/backend
tail -100 error.log

# OR check PM2 logs
pm2 logs

# OR check system logs
tail -50 /var/log/passenger.log
```

### Quick Command Chain (All Steps at Once)
```bash
ssh vdranjxy@sbg106
cd ~/comrades-master && git pull origin main
cd backend
NODE_ENV=production node scripts/check-production-tables.js
NODE_ENV=production node scripts/sync-blog-table-production.js
pm2 restart all
# OR
touch ~/comrades-master/backend/tmp/restart.txt
```

### Verify Deployment
```bash
# Check if new files are present
ls -la ~/comrades-master/backend/scripts/sync-blog-table-production.js
ls -la ~/comrades-master/BLOG_PRODUCTION_FIX.md

# Check git status
cd ~/comrades-master
git log -1 --oneline
# Should show: "Fix: Add production error handling and database sync for blog creation"
```

## Alternative: Manual SQL Approach

If scripts don't work, you can run SQL directly:

```bash
# Connect to MySQL
mysql -u your_username -p your_database

# Then run the SQL from BLOG_PRODUCTION_FIX.md
# (Copy the CREATE TABLE statements)
```

## Support

If you encounter any errors:
1. Copy the complete error message
2. Check the error.log file in backend directory
3. The enhanced logging will now show specific details about what's failing
