# Manual Deployment via SSH (cPanel Button Fix)

## Problem
cPanel's "Deploy HEAD Commit" button shows error:
```
TypeError: Cannot read properties of null (reading 'log_path')
```

This is a **cPanel bug**, not your code. Deploy manually instead.

---

## Option 1: Quick Deploy (Copy-Paste Commands)

### Step 1: Connect to Server
```bash
ssh username@yourdomain.com
# Replace 'username' with your cPanel username
```

### Step 2: Copy and Paste This Entire Block
```bash
# Navigate to repository
cd /home/vdranjxy/production/finalcomrades360

# Pull latest changes
echo "Pulling latest code..."
git fetch origin
git pull origin main
echo "✓ Code updated to commit: $(git rev-parse --short HEAD)"

# Create directories
echo "Creating directories..."
mkdir -p /home/vdranjxy/public_html
mkdir -p /home/vdranjxy/comrades-master

# Deploy frontend
echo "Deploying frontend..."
rsync -avz --delete frontend/dist/ /home/vdranjxy/public_html/
cp -f .htaccess /home/vdranjxy/public_html/.htaccess 2>/dev/null || echo "No .htaccess"

# Deploy backend
echo "Deploying backend..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'uploads' \
  --exclude 'error.log' \
  --exclude '.wwebjs_auth' \
  --exclude 'backups' \
  --exclude 'database/database.sqlite' \
  backend/ /home/vdranjxy/comrades-master/

# Install dependencies
echo "Installing backend dependencies..."
cd /home/vdranjxy/comrades-master
npm install --production

echo ""
echo "✓✓✓ DEPLOYMENT COMPLETE ✓✓✓"
echo ""
echo "Next steps:"
echo "1. Restart Node.js app in cPanel"
echo "2. Clear browser cache"
echo "3. Test the application"
```

---

## Option 2: Use Deployment Script

### Step 1: Upload deploy.sh to Server

**Via SFTP/File Manager:**
1. Upload `deploy.sh` from your project to `/home/vdranjxy/`
2. Connect via SSH
3. Make it executable:
```bash
chmod +x /home/vdranjxy/deploy.sh
```

### Step 2: Run the Script
```bash
/home/vdranjxy/deploy.sh
```

The script will:
- ✓ Create automatic backup
- ✓ Pull latest code from GitHub
- ✓ Deploy frontend to public_html
- ✓ Deploy backend to comrades-master
- ✓ Install dependencies
- ✓ Set correct permissions
- ✓ Show deployment summary

---

## Option 3: Deploy from Windows PowerShell

### Prerequisites
- Install OpenSSH (usually pre-installed on Windows 10+)
- Or use PuTTY

### PowerShell Commands
```powershell
# Connect to server (replace with your details)
ssh username@yourdomain.com

# Once connected, run the deployment block from Option 1
```

---

## After Deployment: Restart Node.js App

### Method 1: Via cPanel
1. Login to cPanel
2. Go to **Setup Node.js App**
3. Find your app (comrades-master)
4. Click **"Restart"** button
5. Wait for "Running" status

### Method 2: Via Command (if available)
```bash
# Some hosts provide restart commands
cd /home/vdranjxy/comrades-master
npm run restart
# or
touch tmp/restart.txt
```

---

## Verify Deployment

### 1. Check Files Were Updated
```bash
# Check frontend bundle
ls -lh /home/vdranjxy/public_html/assets/index-*.js

# Should show new file: index-MmHWgCQI.js (from latest build)

# Check backend rate limit
grep -A 2 "max:" /home/vdranjxy/comrades-master/server.js

# Should show: max: 1000 (not 300)
```

### 2. Check Website
1. Visit: https://comrades360.shop
2. Open DevTools (F12) → Console
3. Look for: `[ConfigLoader] Fetching platform configurations...`
4. Refresh page 5-10 times
5. **Should NOT see any 429 errors**

### 3. Test Rate Limit
```javascript
// In browser console, run:
for (let i = 0; i < 50; i++) {
  fetch('/api/platform/config/platform_settings')
    .then(r => console.log(`Request ${i}: ${r.status}`));
}
// All should return 200 (not rate limited)
```

---

## Troubleshooting

### "Permission Denied" Error
```bash
# Fix permissions
chmod -R 755 /home/vdranjxy/public_html
chmod -R 755 /home/vdranjxy/comrades-master
```

### "git pull" Shows Conflicts
```bash
# Stash local changes and pull
git stash
git pull origin main
git stash pop
```

### "rsync: command not found"
```bash
# Use cp instead
cp -r frontend/dist/* /home/vdranjxy/public_html/
cp -r backend/* /home/vdranjxy/comrades-master/
```

### Backend Not Updating
```bash
# Check if files actually copied
ls -la /home/vdranjxy/comrades-master/server.js
cat /home/vdranjxy/comrades-master/server.js | grep "max: 1000"
```

### Node.js Won't Restart
1. In cPanel → Setup Node.js App
2. Click "Stop"
3. Wait 5 seconds
4. Click "Start"
5. If still fails, click "Destroy" then recreate the app

---

## Future Deployments

**Every time you push to GitHub:**

```bash
# Quick 3-step deployment
ssh username@yourdomain.com
cd /home/vdranjxy/production/finalcomrades360 && git pull origin main && rsync -avz frontend/dist/ /home/vdranjxy/public_html/ && rsync -avz --exclude 'node_modules' backend/ /home/vdranjxy/comrades-master/ && cd /home/vdranjxy/comrades-master && npm install --production
# Then restart Node.js app in cPanel
```

Or just save this as an alias:

```bash
# Add to ~/.bashrc
alias deploy='cd /home/vdranjxy/production/finalcomrades360 && git pull && rsync -avz frontend/dist/ /home/vdranjxy/public_html/ && rsync -avz --exclude node_modules backend/ /home/vdranjxy/comrades-master/ && cd /home/vdranjxy/comrades-master && npm install --production && echo "Done! Restart Node.js app in cPanel"'

# Then just run:
deploy
```

---

## Contact Hosting Support

**Report the cPanel bug to your hosting provider:**

**Issue**: Git Version Control "Deploy HEAD Commit" button fails with error:
```
TypeError: Cannot read properties of null (reading 'log_path')
```

**Request**: Fix the log_path configuration in Git deployment module

**Workaround**: Manual deployment via SSH (works fine)

---

## Summary

✅ **Current Status**: Code pushed to GitHub (commit `0818b0a`)
❌ **cPanel Button**: Broken (internal bug)
✅ **Solution**: Manual deployment via SSH (works perfectly)
✅ **Changes Deployed**: Rate limit fix, batched config loader

**Impact**: Your app will stop getting 429 errors once deployed!

---

## Need Help?

**If SSH doesn't work:**
1. Check if SSH is enabled in cPanel → SSH Access
2. Try using cPanel Terminal (in cPanel interface)
3. Or use File Manager to manually copy files (slower but works)

**SSH Access Issues:**
- Enable SSH in cPanel: Security → SSH Access → Manage SSH Keys
- Or use cPanel's built-in Terminal: Advanced → Terminal

**Still stuck?**
- Take a screenshot of the error
- Share your hosting provider name
- We can explore alternative deployment methods
