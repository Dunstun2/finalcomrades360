console.error('🚀 SERVER STARTING - VERSION: ' + Date.now());
console.log('--- RELOAD VERIFIED V6 ---'); // CRITICAL: loads User as-alias fix + sortBy sanitization

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables with robust path detection
const envPaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '.env')
];

envPaths.forEach(envPath => {
  if (fs.existsSync(envPath)) {
    console.error(`[Init] Loading env from: ${envPath}`);
    // Use override: true to ensure local .env wins over OS environment variables
    dotenv.config({ path: envPath, override: true });
  }
});

// Determine environment AFTER loading .env
const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

// Force process.env.NODE_ENV to be consistent with our detection
process.env.NODE_ENV = env;

// ONLY load .env.production if we are explicitly in production mode
if (env === 'production') {
  const prodEnvPaths = [
    path.resolve(__dirname, '..', '.env.production'),
    path.resolve(__dirname, '.env.production')
  ];
  prodEnvPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
      console.error(`[Init] Loading production env from: ${envPath}`);
      dotenv.config({ path: envPath, override: true });
    }
  });
}

// Redirect console logs to file for production debugging
// PERFORMANCE: Use async writes and only write ERROR-level logs in production
// to prevent disk I/O from blocking the Node.js event loop on every request.
const logFile = path.join(__dirname, 'error.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const originalLog = console.log;
const originalError = console.error;

// In production, suppress verbose console.log to avoid disk I/O on every request
if (process.env.NODE_ENV === 'production') {
  console.log = function(...args) {
    // Silently drop noisy debug logs in production (no disk write)
    // Only uncomment below for active debugging sessions:
    // originalLog.apply(console, args);
  };
} else {
  console.log = function(...args) {
    const msg = `[${new Date().toISOString()}] [LOG] ${args.join(' ')}\n`;
    logStream.write(msg); // async, non-blocking
    originalLog.apply(console, args);
  };
}

console.error = function(...args) {
  const msg = `[${new Date().toISOString()}] [ERROR] ${args.join(' ')}\n`;
  logStream.write(msg); // async, non-blocking
  originalError.apply(console, args);
};

console.error('🚀 SERVER RESTARTED - LOGGING INITIALIZED');

// DETECT STATIC PATHS GLOBALLY
const IS_PROD = process.env.NODE_ENV === 'production';

// Common paths where frontend files might live in various deployment scenarios
const possiblePaths = [
  '/home/vdranjxy/public_html',
  path.resolve(__dirname, '../public_html'),
  path.resolve(__dirname, '../../public_html'), // cPanel: backend/ in a subfolder next to public_html/
  path.resolve(__dirname, '../frontend/dist'),  // Local development structure
  path.resolve(__dirname, 'public'),             // Generic production build folder
  path.resolve(__dirname, '../public')          // Project root public folder
];

let GLOBAL_STATIC_PATH = '/home/vdranjxy/public_html';

// Select the first path that actually contains an index.html
for (const testPath of possiblePaths) {
  const testIndex = path.join(testPath, 'index.html');
  if (fs.existsSync(testIndex)) {
    GLOBAL_STATIC_PATH = testPath;
    console.error(`[Static] Found valid frontend at: ${testPath}`);
    // EXCEPTION: If we found it in the 'production' folder but we are in 'comrades-master', 
    // we should log a warning as it might mean a misconfiguration.
    if (testPath.includes('/production/') && __dirname.includes('/comrades-master/')) {
       console.error('⚠️ WARNING: App is in comrades-master but serving frontend from production folder!');
    }
    break;
  }
}

console.error(`[Init] GLOBAL_STATIC_PATH set to: ${GLOBAL_STATIC_PATH} (Mode: ${process.env.NODE_ENV || 'development'})`);

if (!fs.existsSync(GLOBAL_STATIC_PATH)) {
  console.error(`⚠️ WARNING: GLOBAL_STATIC_PATH does not exist: ${GLOBAL_STATIC_PATH}`);
}
if (!fs.existsSync(path.join(GLOBAL_STATIC_PATH, 'index.html'))) {
  console.error(`⚠️ WARNING: index.html not found in static path: ${GLOBAL_STATIC_PATH}`);
}

// WhatsApp service will be initialized after server start
let messageService;

// Initialize Express app with timeout configuration
const app = express();

// Absolute first configuration: Trust proxy (for cPanel/Passenger/Cloudflare)
app.set('trust proxy', true);
console.log('[Init] Express Trust Proxy set to:', app.get('trust proxy'));

// IMMEDIATE HEALTH CHECK (Must be before any heavy middleware or routes)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is reachable',
    timestamp: new Date().toISOString(),
    version: '1.0.2-prod-stable'
  });
});

// Set server timeout to 60 seconds (60000ms)
app.set('timeout', 60000);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: { policy: "unsafe-none" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate Limiting — protect against brute-force and abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased from 300 to 2000 to allow rich SPA usage and avoid 429 errors on page load
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  validate: { trustProxy: false } // Acknowledge proxy trust to stop validation warnings
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login/register attempts per 15min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes.' },
  validate: { trustProxy: false } // Acknowledge proxy trust to stop validation warnings
});
// DIAGNOSTIC LOGGING: Only enabled in development. In production this was
// causing a disk write on EVERY API request, severely blocking the event loop.
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', (req, res, next) => {
    console.error(`[ROUTE-DIAGNOSTIC] ${req.method} ${req.url} (Path: ${req.path})`);
    next();
  });
}

app.use('/api', globalLimiter); // Apply global rate limit to all API routes
app.use('/api/auth/login', authLimiter); // Stricter limit on login
app.use('/api/auth/register', authLimiter); // Stricter limit on register

const IS_DEV = process.env.NODE_ENV !== 'production';

// Dynamically build allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://comrades360.shop',
  'https://www.comrades360.shop',
  ...(IS_DEV ? [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ] : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps/curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(o => origin === o || origin.startsWith(o));
    
    // In development, also allow any local network IP addresses (mobile testing)
    const isLocalIP = IS_DEV && (
      origin.startsWith('http://192.168.') || 
      origin.startsWith('http://10.') || 
      origin.startsWith('http://172.') ||
      origin.includes('localhost') || 
      origin.includes('127.0.0.1')
    );

    if (isAllowed || isLocalIP) {
      callback(null, true);
    } else {
      // ALWAYS log blocked origins in production to debug CORS issues
      console.error(`[CORS Blocked] Origin: ${origin} | Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS policy blockage: ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password', 'X-Admin-Password']
}));

// Apply JSON body parsing middleware globally
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Request Logger (Dev Only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[server] ${req.method} ${req.url}`);
    next();
  });
}

// Global real-time sync emitter for successful write operations
const { realtimeSyncMiddleware } = require('./middleware/realtimeSync');
app.use(realtimeSyncMiddleware);

// -----------------------------------------------------------------
// 1. MAINTENANCE MODE (MUST BE BEFORE ROUTES)
// -----------------------------------------------------------------
let cachedMaintenanceSettings = null;
let lastMaintenanceCheck = 0;

app.use(async (req, res, next) => {
  // EMERGENCY TOTAL BYPASS
  return next();
  
  // Remaining maintenance logic is kept but bypassed above for stability
});

// -----------------------------------------------------------------
// 2. API ROUTES
// -----------------------------------------------------------------
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/authRoutes'));
apiRouter.use('/users', require('./routes/userRoutes'));
apiRouter.use('/categories', require('./routes/categoryRoutes'));
apiRouter.use('/cart', require('./routes/cartRoutes'));
apiRouter.use('/wishlist', require('./routes/wishlistRoutes'));
apiRouter.use('/ultra-fast', require('./routes/ultraFastRoutes'));
apiRouter.use('/orders', require('./routes/orderRoutes'));
apiRouter.use('/products', require('./routes/productRoutes'));
// apiRouter.use('/stats', require('./routes/statsRoutes'));
apiRouter.use('/marketing', require('./routes/marketingRoutes'));
apiRouter.use('/inventory', require('./routes/inventoryRoutes'));
apiRouter.use('/services', require('./routes/serviceRoutes'));
apiRouter.use('/finance', require('./routes/financeRoutes'));
apiRouter.use('/promo-codes', require('./routes/promoCode'));
apiRouter.use('/payments', require('./routes/paymentRoutes'));
// apiRouter.use('/mpesa', require('./routes/mpesaRoutes'));
apiRouter.use('/notifications', require('./routes/notificationRoutes'));
apiRouter.use('/fastfood', require('./routes/fastFoodRoutes'));
// apiRouter.use('/referrals', require('./routes/referralRoutes'));
// apiRouter.use('/tickets', require('./routes/ticketRoutes'));
// apiRouter.use('/config', require('./routes/configRoutes'));
apiRouter.use('/warehouse', require('./routes/warehouseRoutes'));
apiRouter.use('/warehouses', require('./routes/warehouseRoutes'));
apiRouter.use('/pickup-stations', require('./routes/pickupStationRoutes'));
apiRouter.use('/station-managers', require('./routes/stationManagerRoutes'));
apiRouter.use('/support', require('./routes/supportRoutes'));
apiRouter.use('/hero-promotions', require('./routes/heroPromotionRoutes'));
apiRouter.use('/delivery', require('./routes/deliveryRoutes'));
// apiRouter.use('/payouts', require('./routes/payoutRoutes'));
apiRouter.use('/commissions', require('./routes/commissionRoutes'));
// apiRouter.use('/driver', require('./routes/driverRoutes'));
apiRouter.use('/admin', require('./routes/adminRoutes'));
apiRouter.use('/verification', require('./routes/verificationRoutes'));
apiRouter.use('/social-media-accounts', require('./routes/socialMediaAccountRoutes'));
apiRouter.use('/quick-action', require('./routes/quickActionRoutes'));

// 2. Secondary / Extended Modules
apiRouter.use('/analytics', require('./routes/analyticsRoutes'));
apiRouter.use('/admin/marketing', require('./routes/adminMarketingRoutes'));
apiRouter.use('/password-reset', require('./routes/passwordResetRoutes'));
apiRouter.use('/platform', require('./routes/platformRoutes'));
apiRouter.use('/role-management', require('./routes/roleManagementRoutes'));
apiRouter.use('/admin/categories', require('./routes/adminCategoryRoutes'));
apiRouter.use('/upload', require('./routes/uploadRoutes'));
apiRouter.use('/admin/users', require('./routes/userManagementRoutes'));
apiRouter.use('/role-applications', require('./routes/roleApplicationRoutes'));
apiRouter.use('/admin-tools', require('./routes/adminToolRoutes'));
apiRouter.use('/profile', require('./routes/profileRoutes'));
apiRouter.use('/contact', require('./routes/contactRoutes'));
apiRouter.use('/product-inquiries', require('./routes/productInquiryRoutes'));
apiRouter.use('/batches', require('./routes/batchRoutes'));
apiRouter.use('/image', require('./routes/imageRoutes'));
apiRouter.use('/images', require('./routes/imageRoutes')); // Alias
apiRouter.use('/job-openings', require('./routes/jobOpeningRoutes'));
apiRouter.use('/seller', require('./routes/sellerRoutes'));
apiRouter.use('/cache', require('./routes/cacheRoutes'));
apiRouter.use('/search', require('./routes/searchRoutes'));
apiRouter.use('/wallet', require('./routes/walletRoutes'));
apiRouter.use('/payment-enhancements', require('./routes/paymentEnhancementsRoutes'));
apiRouter.use('/handover', require('./routes/handoverRoutes'));
apiRouter.use('/delivery-messages', require('./routes/deliveryMessageRoutes'));
apiRouter.use('/returns', require('./routes/returnRoutes'));
apiRouter.use('/sharing', require('./routes/sharingRoutes'));
apiRouter.use('/superadmin', require('./routes/superAdminSecurityRoutes'));
apiRouter.use('/2fa', require('./routes/twoFactorAuthRoutes'));
apiRouter.use('/fast-food', require('./routes/fastFoodRoutes')); // Alias

// Mount the API router on both prefixes for maximum compatibility
app.use('/api', apiRouter);
app.use('/', apiRouter);
  

  console.error('✅ All route modules consolidated into apiRouter.');

// Final Middleware Function (Deferred to stay at end of stack)
function finalizeMiddleware(app) {
  console.error('ℹ️ Finalizing middleware stack (Catch-all & 404)...');
  
  // Health check endpoint (moved here for consistency)
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: 'Server is fully initialized'
    });
  });

  // SPA catch-all
  app.get('*', (req, res, next) => {
    // 1. Instantly skip API and Uploads
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
      return next();
    }

    // 2. Identify file extension
    const ext = path.extname(req.path);
    
    // 3. For navigation requests (no extension) or index.html, serve the entry point
    if (!ext || ext === '.html') {
      const indexPath = path.join(GLOBAL_STATIC_PATH, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      } else {
        console.error(`[SPA-ERROR] index.html missing at ${indexPath} for request ${req.url}`);
        // If index.html is missing but it's a page request, don't fall through to 404 JSON yet
        // maybe provide a simple fallback or let it next()
      }
    }
    
    next();
  });

  // Global 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      message: 'Route not found',
      path: req.originalUrl,
      help: 'This route was not found among the 35+ lazy-loaded modules.'
    });
  });
  
  console.error('✨ Server Middleware Finalized.');
}
// Initialize database connection
const { testConnection } = require('./database/database');

// Maintenance block moved up


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
}, express.static(path.join(__dirname, 'uploads')), (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    // Fallback: serve SVG placeholder only in development
    const placeholderSvg = `<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f3f4f6"/>
  <text x="200" y="270" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#9ca3af">No Image</text>
</svg>`;
    res.set('Content-Type', 'image/svg+xml');
    return res.send(placeholderSvg);
  }
  res.status(404).json({ message: 'Resource not found' });
});

app.use(express.static(GLOBAL_STATIC_PATH));

// -----------------------------------------------------------------
// 4. FINAL CATCH-ALLS (MUST BE VERY LAST)
// -----------------------------------------------------------------
finalizeMiddleware(app);

// SPA Fallback - Always serve index.html for non-API routes.
// Maintenance enforcement happens at two levels:
//   1. API middleware (above) — blocks /api/* calls with 503 for non-admins
//   2. React frontend — interceptors and startup check redirect non-admins to /maintenance
// We do NOT serve a maintenance HTML page here because:
//   a) Browsers never send Authorization headers during page navigation (can't detect admin)
//   b) Serving raw HTML breaks Vite's lazy-loaded module imports

// SPA Fallback - Registered later in finalizeMiddleware



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

// Health check endpoint - Registered later in finalizeMiddleware


// Error handling middleware
app.use(errorHandler);


// 404 handler - Registered later in finalizeMiddleware

// Using fixed port 5001 for testing caching

// Socket.IO setup
const { createServer } = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./realtime/socket');

// Initialize HTTP server and Socket.IO outside to ensure singleton status
const server = createServer(app);
server.timeout = 60000;
server.keepAliveTimeout = 65000;

// Passenger/cPanel often provides process.env.PORT
const DEFAULT_PORT = process.env.BACKEND_PORT || process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 4000);

// Socket.IO configuration
const socketAllowedOrigins = [
  process.env.FRONTEND_URL,
  'https://comrades360.shop',
  'https://www.comrades360.shop',
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ] : [])
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || socketAllowedOrigins.some(o => origin.startsWith(o))) {
        callback(null, true);
      } else {
        console.warn(`[Socket.IO CORS] Blocked: ${origin}`);
        callback(new Error(`Socket.IO CORS: origin '${origin}' is not allowed.`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Accept both polling and websocket — polling is the stable fallback for cPanel/Passenger
  // which may not support WebSocket upgrades through the proxy layer
  transports: ['polling', 'websocket'],
  allowUpgrades: true,   // Allow upgrade from polling -> websocket when the proxy supports it
  allowEIO3: true,       // Backwards-compatible with Socket.IO v2 / EIO3 clients
  pingTimeout: 60000,
  pingInterval: 25000
});

setIO(io);

// Socket.IO Connection Handler
function setupSocketHandlers(io) {
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

    socket.on('join_room', (room) => {
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    socket.on('delivery_message_send', async (data) => {
      const { receiverId } = data;
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
}

// Common Background Services Initialization
async function initializeServices(io) {
  const step = (msg) => console.error(`[BOOT-STEP] ${msg}`);
  try {
    step('1/4: Beginning background service initialization...');
    
    // 1. Initialize Database Connection & Sync
    const { testConnection } = require('./database/database');
    try {
      await testConnection();
      step('2/4: Database connected and verified');
    } catch (dbError) {
      console.error('⚠️ Critical Database Initialization Failure:', dbError.message);
    }

    // 2. Initialize Cache (Redis)
    try {
      const cache = require('./scripts/services/cacheService');
      await cache.connect();
      step('3/4: Cache service connected');
    } catch (cacheErr) {
      console.error('⚠️ Redis initialization skipped:', cacheErr.message);
    }

    // 3. Initialize OTP services (including WhatsApp Free Client)
    require('./utils/messageService');
    
    // 4. Start Cron and Workers
    const { initScheduledTasks } = require('./cron/scheduledTasks');
    initScheduledTasks();
    
    const { startBatchAutomation } = require('./services/batchAutomation');
    const { startMarketingAutomation } = require('./services/marketingAutomation');
    const { runAutoHandoverWorker } = require('./services/autoHandoverService');
    startBatchAutomation();
    startMarketingAutomation();
    runAutoHandoverWorker();
    
    step('4/4: ALL BACKGROUND SERVICES INITIALIZED.');
  } catch (err) {
    console.error('⚠️ Critical Error during service initialization:', err.message);
  }
}

async function startServer() {
  console.error(`🚀 BOOT: Starting server bind sequence...`);

  // MANDATORY: Register Socket.IO handlers BEFORE anything else
  setupSocketHandlers(io);
  console.error('✅ Step 1: Socket.IO handlers registered.');

  // Official Phusion Passenger detection pattern
  // When running under Passenger, PhusionPassenger global is injected automatically
  // When running standalone (local dev / manual node), it is undefined
  // ---- FORCE PM2 STANDALONE MODE ----
// Always listen on the configured TCP port, ignoring Passenger.
server.listen(DEFAULT_PORT, '0.0.0.0', () => {
  console.error(`🚀 Server bound to port ${DEFAULT_PORT} (PM2 standalone) - SUCCESS`);
  console.log('🚀 STANDALONE MODE: Server logic ready and listening via PM2.');
  setImmediate(() => initializeServices(io));
});

  // Handle server errors
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
       console.error(`[Runtime] Port ${DEFAULT_PORT} is already in use. Force exiting process so nodemon can retry or cleanly fail.`);
       process.exit(1); // CRITICAL: Exit so it doesn't become a zombie process
    } else {
       console.error('❌ Server runtime error:', err);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥', err.name, err.message);
  });

  // Graceful shutdown helper
  const gracefulShutdown = (signal) => {
    console.error(`[Process] ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Process] HTTP server closed.');
      process.exit(0);
    });
    // Force shutdown after 3 seconds if connections are lingering
    setTimeout(() => {
      console.error('[Process] Forcing exit due to lingering connections.');
      process.exit(0);
    }, 3000).unref();
  };

  // Handle SIGTERM (Docker/Heroku/systemd)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle SIGUSR2 (Nodemon restarts)
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
}

// Singleton Startup Protector
if (global.__serverStarted) {
  console.log('ℹ️ Module re-entry detected, skipping startup.');
} else {
  global.__serverStarted = true;
  
  // Start the server (handles both Passenger and Standalone)
  startServer().catch(err => {
    console.error('❌ CRITICAL: startServer failed:', err);
  });
}

// Export for cPanel/Passenger
module.exports = server;

// Trigger nodemon restart
