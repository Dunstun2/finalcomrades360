import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootEnv = loadEnv('', path.resolve(__dirname, '..'));
// Use a dedicated backend port env variable so Vite's own server PORT does not
// accidentally override the backend target.
const backendPort = process.env.BACKEND_PORT || rootEnv.BACKEND_PORT || '6001';
const backendHost = process.env.BACKEND_HOST || '127.0.0.1';

// Custom plugin to manage preloads
function optimizePreloads() {
  return {
    name: 'optimize-preloads',
    transformIndexHtml(html) {
      // Aggressively remove ALL preload links for faster initial load
      // Remove ONLY preloads, not stylesheets
      html = html.replace(/<link[^>]*\srel=['"]?(module)?preload['"]?[^>]*>/gi, '');
      html = html.replace(/<link[^>]*\shref=['"]?(undefined|null| )['"]?[^>]*>/gi, '');
      return html;
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    optimizePreloads() // Add our custom preload optimization
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4500,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    hmr: {
      protocol: 'ws',
      clientPort: 4500,
      timeout: 25000,
      overlay: false,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      // Proxy API requests to the backend
      '/api': {
        target: `http://${backendHost}:${backendPort}`,
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
      // Proxy WebSocket requests
      '/socket.io': {
        target: `ws://${backendHost}:${backendPort}`,
        ws: true,
        changeOrigin: true,
      },
      // Proxy uploads directory for images
      '/uploads': {
        target: `http://${backendHost}:${backendPort}`,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false, // Disable sourcemaps for better performance
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      // external: ['react', 'react-dom'],
      output: {
        // globals: {
        //   react: 'React',
        //   'react-dom': 'ReactDOM',
        // },
        // Optimize chunking strategy for better loading
        manualChunks: (id) => {
          // ── Vendor splitting ──────────────────────────────────────────────
          if (id.includes('node_modules')) {
            if (id.includes('react-icons') || id.includes('@heroicons') || id.includes('@headlessui')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'vendor-api';
            }
            if (id.includes('react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@react-google-maps')) {
              return 'vendor-maps';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            if (id.includes('html2canvas') || id.includes('qrcode') || id.includes('emoji-picker')) {
              return 'vendor-extras';
            }
            return 'vendor';
          }

          // ── Admin: heavy promotion pages (160KB + 117KB source) ───────────
          if (
            id.includes('AdminHeroPromotions') ||
            id.includes('AdminCreateHeroPromotion') ||
            id.includes('AdminCreateVideoBanner') ||
            id.includes('AdminVideoBanners')
          ) {
            return 'page-admin-promotions';
          }

          // ── Admin: subscriptions & returns (large) ────────────────────────
          if (
            id.includes('AdminSubscriptions') ||
            id.includes('AdminReturnsList') ||
            id.includes('AdminBenefitPackageModal') ||
            id.includes('AdminPlanEditorModal')
          ) {
            return 'page-admin-subscriptions';
          }

          // ── Admin: remaining pages & tools ────────────────────────────────
          if (id.includes('/modules/admin/') || id.includes('/pages/dashboard/')) {
            return 'page-admin';
          }

          // ── Seller module ─────────────────────────────────────────────────
          if (id.includes('/modules/seller/')) {
            return 'page-seller';
          }

          // ── Checkout (heavy) separated from order listing ─────────────────
          if (id.includes('Checkout') || id.includes('MealPlanBuilder') || id.includes('SubscriptionConfirmation')) {
            return 'page-checkout';
          }

          // ── Orders / Cart ─────────────────────────────────────────────────
          if (id.includes('/modules/orders/') || id.includes('Cart')) {
            return 'page-commerce';
          }

          // ── FastFood (separate from products) ─────────────────────────────
          if (id.includes('/modules/fastfood/')) {
            return 'page-fastfood';
          }

          // ── Products ──────────────────────────────────────────────────────
          if (id.includes('/modules/products/')) {
            return 'page-products';
          }

          // ── Delivery ──────────────────────────────────────────────────────
          if (id.includes('/modules/delivery/')) {
            return 'page-delivery';
          }

          // ── Finance ───────────────────────────────────────────────────────
          if (id.includes('/modules/finance/')) {
            return 'page-finance';
          }

          // ── Auth (login/register forms) ───────────────────────────────────
          if (id.includes('/modules/auth/')) {
            return 'page-auth';
          }

          // ── Users / Account pages ─────────────────────────────────────────
          if (id.includes('/modules/users/')) {
            return 'page-users';
          }

          // ── Marketing ─────────────────────────────────────────────────────
          if (id.includes('/modules/marketing/')) {
            return 'page-marketing';
          }

          // ── Home page ─────────────────────────────────────────────────────
          if (id.includes('pages/Home') || id.includes('shared/pages/Home')) {
            return 'page-home';
          }

          // ── Dashboard pages ───────────────────────────────────────────────
          if (id.includes('pages/dashboard') || id.includes('/modules/dashboard/')) {
            return 'page-dashboard';
          }

          // ── Shared pages: management-heavy ────────────────────────────────
          if (id.includes('/shared/pages/')) {
            if (
              id.includes('Management') ||
              id.includes('System') ||
              id.includes('Warehouse') ||
              id.includes('Inventory') ||
              id.includes('Batch') ||
              id.includes('Commission')
            ) {
              return 'page-shared-mgmt';
            }
            return 'page-shared';
          }

          // ── Shared components: heavy widgets ──────────────────────────────
          if (id.includes('components/')) {
            if (id.includes('Navbar') || id.includes('Sidebar')) return 'components-nav';
            if (id.includes('ProductCard') || id.includes('ServiceCard')) return 'components-cards';
            if (id.includes('MealPlanBuilder') || id.includes('ScheduleProjectedCost') || id.includes('HandoverCodeWidget')) {
              return 'components-heavy';
            }
            if (id.includes('/shared/components/')) return 'components-shared';
            return 'components';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1600, // Adjusted for this large monorepo
    // Disable preloading of all assets
    assetsInlineLimit: 0,
    // Disable CSS code splitting to prevent FOUC
    cssCodeSplit: false,
  },
  define: {
    'process.env': {},
    global: {},
  },
}));