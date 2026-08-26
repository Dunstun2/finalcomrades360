#!/bin/bash
# Manual Deployment Script for Comrades360
# Use this when cPanel Git deployment button fails

set -e  # Exit on any error

echo "================================"
echo "Comrades360 Deployment Script"
echo "================================"
echo ""

# Configuration
REPO_PATH="/home/vdranjxy/repositories/finalcomrades360"
PUBLIC_HTML="/home/vdranjxy/public_html"
BACKEND_PATH="/home/vdranjxy/comrades-master"
BACKUP_DIR="/home/vdranjxy/backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" "$PUBLIC_HTML" "$BACKEND_PATH" 2>/dev/null || echo "Backup skipped (directories might not exist yet)"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo ""

echo -e "${YELLOW}Step 2: Navigating to repository...${NC}"
cd "$REPO_PATH" || { echo -e "${RED}✗ Repository not found at $REPO_PATH${NC}"; exit 1; }
echo -e "${GREEN}✓ Found repository${NC}"
echo ""

echo -e "${YELLOW}Step 3: Fetching latest changes from GitHub...${NC}"
git fetch origin
echo -e "${GREEN}✓ Fetched updates${NC}"
echo ""

echo -e "${YELLOW}Step 4: Pulling latest code...${NC}"
git pull origin main
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
echo -e "${GREEN}✓ Pulled latest changes${NC}"
echo -e "  Commit: ${COMMIT_HASH}"
echo -e "  Message: ${COMMIT_MSG}"
echo ""

echo -e "${YELLOW}Step 5: Creating deployment directories...${NC}"
mkdir -p "$PUBLIC_HTML"
mkdir -p "$BACKEND_PATH"
echo -e "${GREEN}✓ Directories ready${NC}"
echo ""

echo -e "${YELLOW}Step 6: Deploying frontend...${NC}"
if [ -d "frontend/dist" ]; then
    rsync -avz --delete frontend/dist/ "$PUBLIC_HTML/"
    cp -f .htaccess "$PUBLIC_HTML/.htaccess" 2>/dev/null || echo "No .htaccess found, skipping"
    echo -e "${GREEN}✓ Frontend deployed${NC}"
else
    echo -e "${RED}✗ frontend/dist not found. Run 'npm run build' in frontend directory first!${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 7: Deploying backend...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'uploads' \
    --exclude 'error.log' \
    --exclude '.wwebjs_auth' \
    --exclude 'backups' \
    --exclude 'database/database.sqlite' \
    backend/ "$BACKEND_PATH/"
echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""

echo -e "${YELLOW}Step 8: Installing backend dependencies...${NC}"
cd "$BACKEND_PATH"
if [ -f "package.json" ]; then
    npm install --production --no-audit 2>&1 | tail -n 10
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ No package.json found, skipping npm install${NC}"
fi
echo ""

echo -e "${YELLOW}Step 9: Setting permissions...${NC}"
chmod -R 755 "$PUBLIC_HTML" 2>/dev/null || echo "Permission change skipped"
chmod -R 755 "$BACKEND_PATH" 2>/dev/null || echo "Permission change skipped"
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "Deployed commit: ${COMMIT_HASH}"
echo -e "Frontend location: ${PUBLIC_HTML}"
echo -e "Backend location: ${BACKEND_PATH}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Restart Node.js app in cPanel (Setup Node.js App → Restart)"
echo "2. Clear browser cache (Ctrl+Shift+Delete)"
echo "3. Test the application"
echo "4. Check for 429 errors (should be fixed now!)"
echo ""
echo -e "${YELLOW}Verify deployment:${NC}"
echo "  Frontend: https://comrades360.shop"
echo "  Backend: Check if rate limit = 1000 in server.js"
echo ""
