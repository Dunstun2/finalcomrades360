console.log('🚀 SERVER STARTING - VERSION: ' + Date.now());
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize OTP services (including WhatsApp Free Client)
require('./utils/messageService');

// Initialize Express app with timeout configuration
const app = express();

// Set server timeout to 60 seconds (60000ms)
app.set('timeout', 60000);

// Security Middleware
// app.use(helmet({ ... })); // Disabled for CSP debugging
app.use(compression());

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:4000', 'http://127.0.0.1:4000', process.env.FRONTEND_URL],
  credentials: true
}));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const legacyFrontendUrl = new URL(FRONTEND_URL);
legacyFrontendUrl.port = '3000';

app.use(cors({
  origin: [
    FRONTEND_URL,
    FRONTEND_URL.replace('localhost', '127.0.0.1'),
    legacyFrontendUrl.toString(),
    legacyFrontendUrl.toString().replace('localhost', '127.0.0.1'),
    'http://localhost:4000',
    'http://127.0.0.1:4000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password', 'X-Admin-Password']
}));

// Apply JSON body parsing middleware globally
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[server] Incoming Request: ${req.method} ${req.url}`);
  if (req.url.includes('mark-arrived')) {
    console.log(`[server] Debug: Hitting mark-arrived route!`);
  }
  next();
});

// Global real-time sync emitter for successful write operations
const { realtimeSyncMiddleware } = require('./middleware/realtimeSync');
app.use(realtimeSyncMiddleware);

// Import routes
const platformRoutes = require('./routes/platformRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const roleManagementRoutes = require('./routes/roleManagementRoutes');
const heroPromotionRoutes = require('./routes/heroPromotionRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminCategoryRoutes = require('./routes/adminCategoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const roleApplicationRoutes = require('./routes/roleApplicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const profileRoutes = require('./routes/profileRoutes');
const socialMediaAccountRoutes = require('./routes/socialMediaAccountRoutes');
const fastFoodRoutes = require('./routes/fastFoodRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const imageRoutes = require('./routes/imageRoutes');
const jobOpeningRoutes = require('./routes/jobOpeningRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const ultraFastRoutes = require('./routes/ultraFastRoutes');
const cacheRoutes = require('./routes/cacheRoutes');
const searchRoutes = require('./routes/searchRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const walletRoutes = require('./routes/walletRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const pickupStationRoutes = require('./routes/pickupStationRoutes');
const stationManagerRoutes = require('./routes/stationManagerRoutes');
console.log('[server] Warehouse routes loaded:', typeof warehouseRoutes);
console.log('[server] Pickup Station routes loaded:', typeof pickupStationRoutes);
const financeRoutes = require('./routes/financeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const paymentEnhancementsRoutes = require('./routes/paymentEnhancementsRoutes');
const batchRoutes = require('./routes/batchRoutes');
const returnRoutes = require('./routes/returnRoutes');
const { startBatchAutomation } = require('./services/batchAutomation');
const { runAutoHandoverWorker } = require('./services/autoHandoverService');
// Initialize database connection
const { testConnection } = require('./database/database');

// Global Maintenance Mode Middleware
app.use(async (req, res, next) => {
  // Allow critical paths even in maintenance
  const allowList = ['/api/auth/login', '/api/auth/me', '/api/admin', '/api/config', '/api/platform/config'];
  const isAllowed = allowList.some(path => req.path.startsWith(path));

  if (isAllowed) return next();

  try {
    const { PlatformConfig } = require('./models');
    const config = await PlatformConfig.findOne({ where: { key: 'maintenance_settings' } });
    if (config) {
      const settings = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
      if (settings.enabled) {
        return res.status(503).json({ 
          success: false, 
          maintenance: true,
          message: settings.message || 'System is currently under maintenance. Please try again later.' 
        });
      }
    }
  } catch (err) {
    // Fail silent to allow app startup
    console.warn('[server] Maintenance check failed:', err.message);
  }
  next();
});

// Use routes
app.use('/api/platform', platformRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories/admin/categories', adminCategoryRoutes);
app.use('/api/categories', categoryRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/role-applications', roleApplicationRoutes);
app.use('/api/roles', roleManagementRoutes);
app.use('/api/hero-promotions', heroPromotionRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/profile', profileRoutes); // Changed from /api/users to avoid conflict with userRoutes
app.use('/api/social-media-accounts', socialMediaAccountRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/pickup-stations', pickupStationRoutes);
app.use('/api/station-manager', stationManagerRoutes);

app.use('/api/marketing', marketingRoutes);

app.use('/api/sellers', sellerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/fastfood', fastFoodRoutes);
app.use('/api/ultra-fast', ultraFastRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/password-reset', require('./routes/passwordResetRoutes'));
console.log('✅ Password Reset Routes Mounted');
app.use('/api/images', imageRoutes);
app.use('/api/job-openings', jobOpeningRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/handover', require('./routes/handoverRoutes'));

console.log('[server] Mounting finance routes...');
app.use('/api/finance', financeRoutes);
app.use('/api/audit', financeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payment-enhancements', paymentEnhancementsRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/returns', returnRoutes);
console.log('✅ Delivery Routes Mounted');
console.log('✅ Warehouse Routes Mounted');
console.log('✅ Pickup Station Routes Mounted');
console.log('✅ Payment Routes Mounted');

// Serve static files from uploads directory with aggressive caching
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');

  // Cache images for 1 year (static/immutable)
  if (req.method === 'GET' && !req.url.includes('?')) {
    res.header('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.header('Cache-Control', 'public, max-age=3600'); // 1 hour for others
  }

  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Static Files
// Priority 1: Local 'public' folder (Production/Deployment)
// Priority 2: '../frontend/dist' (Development)
const productionPath = path.join(__dirname, 'public');
const developmentPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(productionPath) ? productionPath : developmentPath;

console.log(`[server] Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// SPA Fallback - Serve index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return next();
  }

  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html is missing or other error, let the 404 handler deal with it
      next();
    }
  });
});

// Initialize SQLite performance tuning
const { sequelize } = require('./database/database'); // Verified

if (sequelize.options.dialect === 'sqlite') {
  sequelize.authenticate().then(() => {
    console.log('🔧 Running SQLite PRAGMA tuning...');
    sequelize.query('PRAGMA journal_mode = WAL;');
    sequelize.query('PRAGMA synchronous = NORMAL;');
    sequelize.query('PRAGMA temp_store = MEMORY;');
    sequelize.query('PRAGMA mmap_size = 30000000000;');
  }).catch(err => console.error('Failed to run PRAGMAs:', err));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    version: '1.1.0-payment-fix',
    timestamp: new Date().toISOString()
  });
});


// Error handling middleware
// Error handling middleware

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  
  const errorDetail = `\n--- ${new Date().toISOString()} ---\n` +
    `Request: ${req.method} ${req.url}\n` +
    `Error: ${err.message}\n` +
    `Stack: ${err.stack}\n` +
    `Body: ${JSON.stringify(req.body || {})}\n`;

  fs.appendFileSync(path.join(__dirname, 'error.log'), errorDetail);
  console.error('Error middleware:', err.stack);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      detail: 'Check backend/error.log for more info'
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Using fixed port 5001 for testing caching

// Socket.IO setup
const { createServer } = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./realtime/socket');

// Start server after database connection
const DEFAULT_PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // Attempt database connection but don't crash if it fails
    try {
      await testConnection();
    } catch (dbError) {
      console.error('⚠️ Database connection failed, but starting server anyway:', dbError.message);
    }

    // Create HTTP server with timeout configuration
    const server = require('http').createServer(app);

    // Set server timeout to 60 seconds (60000ms)
    server.timeout = 60000;
    server.keepAliveTimeout = 65000; // Keep connection alive for 65 seconds

    // Initialize scheduled tasks (Cron jobs)
    const { initScheduledTasks } = require('./cron/scheduledTasks');
    try {
      initScheduledTasks();
      // Start the auto-handover background worker
      runAutoHandoverWorker();
    } catch (e) { console.error('Cron/Worker Init Failed:', e.message); }

    // Initialize Socket.IO with CORS
    const io = new Server(server, {
      cors: {
        origin: ['http://localhost:4000', 'http://127.0.0.1:4000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Set up socket.io instance
    setIO(io);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_user', (userId) => {
        if (userId) {
          socket.join(`user_${userId}`);
          socket.join(`user:${userId}`);
          console.log(`User ${userId} joined their room`);
        }
      });

      socket.on('join_admin', () => {
        socket.join('admin_room');
        socket.join('admin');
        console.log('Admin connected to admin room');
      });

      socket.on('delivery_message_send', async (data) => {
        const { receiverId } = data;
        // Real-time broadcast for non-REST messages (if any)
        // However, we now prefer REST API for persistence + broadcast.
        // This handler remains for legacy/simultaneous support but WITHOUT DB write.
        io.to(`user_${receiverId}`).emit('delivery_message_receive', data);
      });

      socket.on('delivery_typing', (data) => {
        const { receiverId, orderId, isTyping } = data;
        io.to(`user_${receiverId}`).emit('delivery_typing_receive', {
          senderId: data.senderId,
          orderId,
          isTyping
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Start the server
    server.listen(DEFAULT_PORT, () => {
      console.log(`🚀 Server running on port ${DEFAULT_PORT} - REBOOT SUCCESSFUL - Version: ${Date.now()}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${DEFAULT_PORT} is already in use. Please stop any other services using this port.`);
      }
      // Do NOT process.exit(1) here in production managed environments
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Logging error...');
      console.error(err.name, err.message);
      // Removed server.close() to prevent 503 loop
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('Failed the initial startup sequence:', error.message);
    // Proceed to try listen anyway if possible, or fallback
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};

// Restart 1772711452057// Restart 1774100536.86857
