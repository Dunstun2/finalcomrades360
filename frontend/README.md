# Comrades360 Plus Frontend

Modern React web application for the Comrades360 Plus marketplace platform, built with Vite, React 18, TailwindCSS, and Socket.IO.

## Overview

A responsive, performance-optimized web interface for:

- **Customer Dashboard** - Browse products, manage orders, track deliveries
- **Seller Dashboard** - Manage inventory, view sales, handle orders
- **Delivery Agent Dashboard** - Accept tasks, update delivery status, track earnings
- **Marketing Dashboard** - Manage campaigns and referrals
- **Finance Dashboard** - View transactions and analytics
- **Admin Panel** - Platform configuration and user management

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Development server runs on `http://localhost:4000` with backend API proxied from `:3000`.

## Build for Production

```bash
npm run build
# Output in dist/
npm run preview  # Test production build locally
```

## Project Structure

```
frontend/src/
├── pages/              # Route pages (Home, Cart, Orders, Dashboard, etc.)
├── components/         # Reusable React components
│   ├── layout/         # Page layouts
│   ├── ui/             # Generic UI components
│   ├── forms/          # Form components
│   ├── auth/           # Authentication UI
│   ├── dashboard/      # Dashboard-specific components
│   └── ...
├── contexts/           # Global state with React Context
│   ├── AuthContext         # User authentication
│   ├── CartContext         # Shopping cart
│   ├── WishlistContext     # Wishlist
│   └── CategoriesContext   # Product categories
├── services/           # API clients and service wrappers
│   ├── api.js          # Axios instance with interceptors
│   ├── productApi.js   # Product endpoints
│   ├── paymentService.js
│   └── ...
├── hooks/              # Custom React hooks
│   ├── usePersistentFetch    # Fetch with localStorage caching
│   ├── useOptimizedHomepage  # Homepage data loading
│   └── ...
├── utils/              # Helper functions
│   ├── imageUtils.js   # Image handling and CDN URLs
│   ├── validation.js   # Form validation helpers
│   ├── currency.js     # Currency formatting
│   └── ...
├── styles/             # Global styles
└── main.jsx            # Entry point
```

## Key Features

### Pages
- **Home** - Hero promotions, product grid, fast-food section
- **Product Details** - Full product info, reviews, related products
- **Cart** - Shopping cart with checkout
- **Orders** - Order history and status tracking
- **Order Tracking** - Real-time delivery tracking with map
- **Checkout** - Payment and address entry
- **Search** - Full-text product search
- **Auth** - Login, register, password reset, 2FA

### Dashboards (Role-Based)
- **Customer Account** - Profile, addresses, payment methods
- **Seller Dashboard** - Inventory, orders, analytics
- **Delivery Agent** - Tasks, earnings, performance
- **Admin** - Users, categories, configuration

### Advanced Features
- **Real-time Updates** - Socket.IO for live notifications
- **Image Optimization** - Responsive images with multiple resolutions
- **Caching** - IndexedDB for offline access, localStorage for preferences
- **Performance** - Code splitting, lazy loading, image preloading
- **Accessibility** - WCAG compliance, semantic HTML
- **Mobile Responsive** - Mobile-first design with TailwindCSS

## Styling

### TailwindCSS
- Custom color scheme aligned with brand
- Responsive utilities for mobile/tablet/desktop
- Plugins for animations and transitions
- PostCSS integration for processing

```bash
npm run build:css  # Build TailwindCSS
```

### Component Library
- **Radix UI** - Unstyled, accessible primitives
- **Lucide React** - Icon library
- **Custom Components** - Built on top of Radix/HTML

## State Management

### Context API
- `AuthContext` - User login state, permissions
- `CartContext` - Shopping cart items, quantities
- `WishlistContext` - Saved products
- `CategoriesContext` - Product categories cache

### Local Storage
- User preferences (theme, marketing mode)
- Cart state
- Search history

### IndexedDB
- Persistent cache for product data
- Offline order history

## API Integration

### Axios Configuration
- Base URL: `/api` (Vite proxies to backend in dev)
- Request deduplication for identical GET requests
- Auth token injection in headers
- Error interceptors for centralized handling

### Services
```javascript
// Usage example
import { productApi } from '@/services/api';

const products = await productApi.getProducts({ category: 'food' });
```

## Forms & Validation

### React Hook Form + Yup/Zod
- Minimal re-renders
- Built-in error handling
- Custom validation rules
- Async form submission

Example:
```jsx
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(validationSchema)
});
```

## Authentication

### Token-Based (JWT)
- Tokens stored in secure cookies (httpOnly recommended)
- Auto token refresh on 401 responses
- Login/logout clear state
- Protected routes gate access by auth status

### Two-Factor Authentication
- Optional 2FA for account security
- SMS/Email verification

## Real-time with Socket.IO

Connected to backend for:
- Order status notifications
- Delivery tracking updates
- Chat/messages (if enabled)
- Live price updates

```jsx
import { socket } from '@/services/socket';

socket.on('order:updated', (order) => {
  // Handle update
});
```

## Performance Optimizations

- **Code Splitting** - Route-based lazy loading
- **Image Optimization** - WebP with fallbacks, responsive sizes
- **Caching** - HTTP caching headers, service worker
- **Bundling** - Vite for fast builds and HMR
- **Monitoring** - Performance metrics tracking

### Vite Config
```javascript
// vite.config.js
export default {
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: { target: 'es2020', minify: 'terser' }
}
```

## Development

```bash
npm run dev         # Start dev server with HMR
npm run build       # Production build
npm run preview     # Test production build
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Environment Variables

Create `.env` file:

```
VITE_API_BASE=/api
VITE_GOOGLE_MAPS_KEY=your-key
VITE_ENV=development
```

## Testing

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
```

## Contributing

- Keep components in appropriate folders (pages/, components/)
- Use hooks for state and side effects
- Keep API calls in services/ directory
- Add unit tests for complex logic
- Follow naming conventions from `.github/instructions/`

See root `README.md` for more details.

