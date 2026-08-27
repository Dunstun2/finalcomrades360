#!/bin/bash
# Restart PM2 with proper environment loading

echo "🔄 Stopping PM2 process..."
npx pm2 stop comrades360 2>/dev/null || true
npx pm2 delete comrades360 2>/dev/null || true

echo "📁 Changing to comrades-master directory..."
cd ~/comrades-master

echo "🚀 Starting PM2 with environment variables..."
npx pm2 start server.js \
  --name comrades360 \
  --env production \
  --node-args="--max-old-space-size=512"

echo "💾 Saving PM2 configuration..."
npx pm2 save

echo "📋 Checking PM2 logs..."
sleep 3
npx pm2 logs comrades360 --lines 30 --nostream

echo ""
echo "✅ PM2 restart complete!"
echo ""
echo "To view live logs, run:"
echo "  npx pm2 logs comrades360"
