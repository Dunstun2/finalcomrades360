# Quick Deploy Guide - Updated for Your Setup

**Your Repository Path**: `/home/vdranjxy/production/finalcomrades360`

---

## 🚀 Deploy in 3 Steps

### Method 1: Fix cPanel Button (One-Time Setup)

**1. Open cPanel Terminal** (Advanced → Terminal)

**2. Run these commands:**
```bash
cd /home/vdranjxy/production/finalcomrades360
git pull origin main
chmod +x fix-cpanel-deploy.sh
./fix-cpanel-deploy.sh
```

**3. Test the button:**
- Refresh cPanel Git Version Control page (Ctrl+F5)
- Click "Update from Remote"
- Click "Deploy HEAD Commit"
- ✅ Should work now!

---

### Method 2: Manual Deploy (Always Works)

**In cPanel Terminal, paste this ONE command:**
```bash
cd /home/vdranjxy/production/finalcomrades360 && git pull origin main && mkdir -p /home/vdranjxy/public_html /home/vdranjxy/comrades-master && rsync -avz frontend/dist/ /home/vdranjxy/public_html/ && cp -f .htaccess /home/vdranjxy/public_html/.htaccess 2>/dev/null && rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'error.log' backend/ /home/vdranjxy/comrades-master/ && cd /home/vdranjxy/comrades-master && npm install --production && echo "✓ Deployment complete! Now restart Node.js app in cPanel"
```

**Then:**
- Go to cPanel → **Setup Node.js App**
- Click **"Restart"**
- Done! ✅

---

### Method 3: Use Deploy Script

**In cPanel Terminal:**
```bash
cd /home/vdranjxy/production/finalcomrades360
git pull origin main
chmod +x deploy.sh
./deploy.sh
```

**Then restart Node.js app in cPanel**

---

## 📋 After Deployment

1. **Restart Node.js**: cPanel → Setup Node.js App → Restart
2. **Clear browser cache**: Ctrl+Shift+Delete
3. **Test**: Visit your site and refresh 5-10 times
4. **Verify**: No 429 errors in browser console!

---

## ✅ What Gets Deployed

- ✅ Backend rate limit fix (300 → 1000 requests)
- ✅ Frontend batched config loader (faster loading)
- ✅ Production-optimized bundles
- ✅ All latest changes from GitHub

---

## 🔧 Troubleshooting

**"Permission denied"**
```bash
chmod 755 /home/vdranjxy/public_html
chmod 755 /home/vdranjxy/comrades-master
```

**"Directory not found"**
```bash
mkdir -p /home/vdranjxy/public_html
mkdir -p /home/vdranjxy/comrades-master
```

**"git pull fails"**
```bash
cd /home/vdranjxy/production/finalcomrades360
git stash
git pull origin main
```

---

## 📞 Quick Commands Reference

**Check current commit:**
```bash
cd /home/vdranjxy/production/finalcomrades360
git log -1 --oneline
```

**View deployment log:**
```bash
cat /home/vdranjxy/logs/git-deploy.log
```

**Force update:**
```bash
cd /home/vdranjxy/production/finalcomrades360
git fetch --all
git reset --hard origin/main
```

---

**Current Commit**: `a975bf4` - Rate limit fix + cPanel button fix
**Ready to deploy!** Choose any method above.
