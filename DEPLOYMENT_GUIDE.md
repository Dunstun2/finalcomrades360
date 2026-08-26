# cPanel Git Deployment Troubleshooting Guide

## Issue: "Deploy HEAD Commit" Button Not Working

### Quick Checks

1. **Verify Repository Status**
   - In cPanel Git Version Control, check if the repository shows the latest commit hash: `0818b0a`
   - If not, click "Update from Remote" first

2. **Check Button State**
   - Is the button grayed out? → Repository might be up to date already
   - Does it show an error? → Check authentication
   - Does nothing happen? → Check JavaScript console in browser

3. **Browser Console Check**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Click "Deploy HEAD Commit"
   - Look for any JavaScript errors

### Manual Deployment via SSH (Alternative)

If the button doesn't work, deploy via SSH:

```bash
# 1. SSH into your server
ssh username@yourdomain.com

# 2. Navigate to repository
cd /home/vdranjxy/repositories/finalcomrades360

# 3. Pull latest changes
git fetch origin
git pull origin main

# 4. Run deployment tasks manually
mkdir -p /home/vdranjxy/public_html
mkdir -p /home/vdranjxy/comrades-master

# 5. Deploy frontend
rsync -avz frontend/dist/ /home/vdranjxy/public_html/
cp .htaccess /home/vdranjxy/public_html/.htaccess

# 6. Deploy backend
rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'error.log' backend/ /home/vdranjxy/comrades-master/

# 7. Install backend dependencies (if needed)
cd /home/vdranjxy/comrades-master
npm install --production

# 8. Restart Node.js application
# (Method varies by hosting provider - check cPanel Node.js app manager)
```

### Common Causes & Fixes

#### 1. Authentication Issues
**Symptom**: Button does nothing or shows auth error

**Fix**:
- Go to cPanel → Git Version Control → Manage
- Remove and re-add SSH key
- Or use HTTPS with Personal Access Token instead

#### 2. Repository Path Wrong
**Symptom**: Deploy fails silently

**Fix**:
- Verify repository path in cPanel matches actual location
- Should be: `/home/vdranjxy/repositories/finalcomrades360`

#### 3. Permissions Issues
**Symptom**: Deploy logs show permission denied

**Fix**:
```bash
# Set correct ownership
chown -R username:username /home/vdranjxy/public_html
chown -R username:username /home/vdranjxy/comrades-master

# Set correct permissions
chmod -R 755 /home/vdranjxy/public_html
chmod -R 755 /home/vdranjxy/comrades-master
```

#### 4. .cpanel.yml Not Found
**Symptom**: Deploy does nothing

**Fix**:
- Verify `.cpanel.yml` is in repository root
- Check it was pushed to GitHub: ✅ (it was in our push)
- Verify file permissions: `chmod 644 .cpanel.yml`

#### 5. Node.js Not Installed
**Symptom**: Backend doesn't update

**Fix**:
- In cPanel, go to **Setup Node.js App**
- Create/verify Node.js application pointing to `/home/vdranjxy/comrades-master`
- Set entry point: `server.js`
- Install dependencies

### Verify Deployment Success

After deployment, verify:

#### 1. Frontend Updated
```bash
# Check if new files are present
ls -la /home/vdranjxy/public_html/assets/

# Should see new bundle files:
# - components-TJl_D4vZ.js
# - configLoader.js (in src/utils)
```

#### 2. Backend Updated
```bash
# Check if server.js has new rate limit settings
grep -A 5 "max: 1000" /home/vdranjxy/comrades-master/server.js
# Should show: max: 1000
```

#### 3. Application Running
- Visit your website
- Open DevTools → Console
- Look for: `[ConfigLoader] Fetching platform configurations...`
- Refresh multiple times - should NOT see 429 errors

### Alternative: Deploy via cPanel File Manager

If Git deployment fails completely:

1. **Backup current files**
   ```bash
   cd /home/vdranjxy
   tar -czf backup-$(date +%Y%m%d).tar.gz public_html comrades-master
   ```

2. **Download from GitHub**
   - Go to: https://github.com/Dunstun2/finalcomrades360
   - Click "Code" → "Download ZIP"
   - Extract locally

3. **Upload via File Manager**
   - In cPanel → File Manager
   - Upload `frontend/dist/*` to `/home/vdranjxy/public_html/`
   - Upload `backend/*` to `/home/vdranjxy/comrades-master/`

4. **Set Permissions**
   - Select uploaded files
   - Change Permissions → 755 for folders, 644 for files

5. **Restart Node.js App**
   - cPanel → Setup Node.js App
   - Click "Restart" button

### Check Deployment Logs

View deployment logs in cPanel:

1. Git Version Control → Manage → Deployment Tasks
2. Look for errors in the log output
3. Common errors:
   - "Permission denied" → Fix permissions
   - "No such file or directory" → Check paths in .cpanel.yml
   - "Command not found" → Verify command paths

### Update .cpanel.yml with Logging (Optional)

Add error logging to see what's failing:

```yaml
---
deployment:
  tasks:
    - echo "Starting deployment..." >> /home/vdranjxy/deploy.log
    - /bin/mkdir -p /home/vdranjxy/public_html 2>> /home/vdranjxy/deploy.log
    - /bin/mkdir -p /home/vdranjxy/comrades-master 2>> /home/vdranjxy/deploy.log
    
    - echo "Deploying frontend..." >> /home/vdranjxy/deploy.log
    - /usr/bin/rsync -avz frontend/dist/ /home/vdranjxy/public_html/ 2>> /home/vdranjxy/deploy.log
    - /bin/cp .htaccess /home/vdranjxy/public_html/.htaccess 2>> /home/vdranjxy/deploy.log
    
    - echo "Deploying backend..." >> /home/vdranjxy/deploy.log
    - /usr/bin/rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'error.log' backend/ /home/vdranjxy/comrades-master/ 2>> /home/vdranjxy/deploy.log
    
    - echo "Deployment complete!" >> /home/vdranjxy/deploy.log
    - date >> /home/vdranjxy/deploy.log
```

Then check `/home/vdranjxy/deploy.log` for details.

### Contact Hosting Support

If none of the above works:

1. **Information to provide**:
   - Hosting provider name
   - cPanel version
   - Error messages (if any)
   - Screenshot of Git Version Control page
   - Contents of `.cpanel.yml`

2. **Ask them to**:
   - Verify Git deployment is enabled
   - Check deployment logs
   - Verify file permissions
   - Confirm repository path

### Quick Test

To verify Git deployment works at all:

1. Make a small change to test:
   ```bash
   echo "# Test deployment" >> README.md
   git add README.md
   git commit -m "Test: Verify deployment"
   git push origin main
   ```

2. In cPanel, click "Deploy HEAD Commit"

3. Check if README.md appears in the repository folder

If this works, the issue might be with the `.cpanel.yml` tasks, not the button itself.

---

## Current Deployment Status

**Latest Commit**: `0818b0a` - "Fix: Rate limiting - increase limit and add batched config loader"

**Files to Deploy**:
- Backend rate limiter changes
- Frontend batched config loader
- Production build bundles
- Documentation files

**Critical Changes**:
- `backend/server.js` - Rate limit increased
- `frontend/src/utils/configLoader.js` - New file
- `frontend/src/contexts/PlatformContext.jsx` - Uses batched loader
- `frontend/dist/*` - Rebuilt production bundles

**Post-Deployment**:
1. Restart Node.js application in cPanel
2. Clear browser cache
3. Test rate limiting (refresh multiple times)
4. Verify no 429 errors in console

---

**Need Help?** Provide:
- Screenshot of cPanel Git Version Control page
- Any error messages
- Browser console output when clicking deploy button
