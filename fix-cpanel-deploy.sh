#!/bin/bash
# Fix cPanel Git Deployment log_path Error
# Run this ONCE via cPanel Terminal to fix the deploy button

echo "================================"
echo "Fixing cPanel Git Deploy Button"
echo "================================"
echo ""

# Create logs directory
echo "Creating logs directory..."
mkdir -p /home/vdranjxy/logs
touch /home/vdranjxy/logs/git-deploy.log
chmod 644 /home/vdranjxy/logs/git-deploy.log
echo "✓ Log directory created"

# Create deployment directories
echo "Creating deployment directories..."
mkdir -p /home/vdranjxy/public_html
mkdir -p /home/vdranjxy/comrades-master
chmod 755 /home/vdranjxy/public_html
chmod 755 /home/vdranjxy/comrades-master
echo "✓ Deployment directories ready"

# Initialize git repository configuration
echo "Checking repository..."
REPO_PATH="/home/vdranjxy/production/finalcomrades360"
if [ -d "$REPO_PATH" ]; then
    cd "$REPO_PATH"
    
    # Ensure .cpanel.yml exists
    if [ -f ".cpanel.yml" ]; then
        echo "✓ .cpanel.yml found"
    else
        echo "✗ .cpanel.yml not found - you may need to pull from GitHub"
    fi
    
    # Update repository metadata
    git config core.fileMode false
    git config --local user.name "cPanel Deploy"
    git config --local user.email "deploy@comrades360.shop"
    echo "✓ Repository configured"
else
    echo "✗ Repository not found at $REPO_PATH"
    echo "  You may need to create it in cPanel Git Version Control first"
fi

# Create a deployment marker file
echo "Creating deployment marker..."
echo "$(date)" > /home/vdranjxy/.last-deployment
chmod 644 /home/vdranjxy/.last-deployment
echo "✓ Marker created"

echo ""
echo "================================"
echo "Fix Complete!"
echo "================================"
echo ""
echo "Now try these steps:"
echo "1. Go back to cPanel Git Version Control"
echo "2. Refresh the page (Ctrl+F5)"
echo "3. Click 'Update from Remote'"
echo "4. Then click 'Deploy HEAD Commit'"
echo ""
echo "If it still doesn't work, check the log:"
echo "  cat /home/vdranjxy/logs/git-deploy.log"
echo ""
echo "Or use manual deployment:"
echo "  cd $REPO_PATH"
echo "  ./deploy.sh"
echo ""
