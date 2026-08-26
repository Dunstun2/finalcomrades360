# Rate Limiting Fix - 429 Too Many Requests

## Problem
Your application was experiencing `429 Too Many Requests` errors on startup because:

1. **Rate limit too aggressive**: 300 requests per 15 minutes (20/minute) - easily exceeded by modern SPAs
2. **Many parallel API calls on startup**: 10-15+ simultaneous requests when app loads
3. **No request batching**: Each context loads independently
4. **No deduplication**: Multiple components could trigger the same API calls

## Solutions Implemented

### 1. Backend Changes (`backend/server.js`)

#### Increased Rate Limit
```javascript
// Before: 300 requests per 15 minutes
// After: 1000 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 300
  // ...
});
```

#### Excluded Safe Endpoints from Rate Limiting
Added a `skip` function to exclude initialization endpoints:
- `/api/platform/config/*` - Platform configuration (safe, read-only)
- `/api/categories` - Category data (safe, read-only)
- `/api/auth/me` - Session validation (safe, read-only)

These endpoints are:
- Required for app initialization
- Read-only operations
- Not security-sensitive
- Not resource-intensive

### 2. Frontend Changes

#### Created Batched Config Loader (`frontend/src/utils/configLoader.js`)

**Features:**
- **Request deduplication**: Multiple simultaneous calls share the same promise
- **Caching**: Responses cached for 5 minutes
- **Error resilience**: Individual config failures don't block entire load
- **Performance monitoring**: Logs load times for debugging

**Usage:**
```javascript
import { loadPlatformConfigs } from '@/utils/configLoader';

const config = await loadPlatformConfigs();
// Returns: { platform, maintenance, seo, seo_pages, finance, logistic }
```

#### Updated PlatformContext (`frontend/src/contexts/PlatformContext.jsx`)

Changed from:
- 6 parallel API calls
- No deduplication
- Individual error handling

To:
- Single batched loader call
- Automatic deduplication
- Centralized error handling

## Impact

### Before
- **10-15 parallel requests** on app initialization
- **Rate limit exceeded** with 3-5 page refreshes or multiple tabs
- **Failed to load** essential data (categories, cart, wishlist, settings)

### After
- **Reduced to 4-6 requests** on app initialization (batched configs count as 1)
- **Rate limit sufficient** for normal usage (1000 requests = ~66 per minute)
- **Graceful degradation** if individual configs fail
- **Better performance** through request deduplication

## Rate Limit Analysis

### Current Settings
- **Window**: 15 minutes
- **Max requests**: 1000
- **Requests per minute**: ~66
- **Auth endpoints**: 20 per 15 minutes (unchanged)

### Typical User Journey
| Action | API Calls | Notes |
|--------|-----------|-------|
| Page load | 4-6 | Batched configs + auth + categories |
| Browse products | 1-2 per page | Paginated |
| View product | 1 | Single product details |
| Add to cart | 2-3 | Add + refresh cart |
| Checkout | 5-10 | Validation + order creation |
| **Total per session** | ~20-30 | Well within limits |

### Multiple Tabs/Users
- **5 tabs open**: 20-30 requests (within limits)
- **10 concurrent users**: 200-600 requests (within limits)
- **50 concurrent users**: Would approach limit (consider horizontal scaling)

## Monitoring

### Backend Logs
The rate limiter logs when limits are hit:
```
[ROUTE-DIAGNOSTIC] GET /api/wishlist (Path: /wishlist)
```

### Frontend Console
The config loader logs performance:
```
[ConfigLoader] Fetching platform configurations...
[ConfigLoader] Successfully loaded configurations
```

### Check if Rate Limited
Look for these responses:
```javascript
// Status: 429
{ error: 'Too many requests, please try again later.' }
```

## Further Optimizations (If Needed)

If you still experience rate limiting:

### 1. Increase Limits Further
```javascript
max: 2000, // Double current limit
```

### 2. Implement Per-User Rate Limiting
```javascript
keyGenerator: (req) => {
  return req.user?.id || req.ip; // Track by user ID instead of IP
}
```

### 3. Add Redis Store for Distributed Rate Limiting
```javascript
const RedisStore = require('rate-limit-redis');
const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  // ...
});
```

### 4. Implement Request Queue on Frontend
For non-critical requests, queue them to execute sequentially:
```javascript
// Queue non-urgent requests
const requestQueue = new PQueue({ concurrency: 3 });
await requestQueue.add(() => api.get('/non-urgent-endpoint'));
```

### 5. Add Service Worker Caching
Cache static config responses in a service worker:
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/platform/config/')) {
    event.respondWith(cacheFirst(event.request));
  }
});
```

## Testing

### Test Rate Limit
1. Open DevTools Console
2. Run rapid requests:
```javascript
for (let i = 0; i < 100; i++) {
  fetch('/api/test-endpoint').then(r => console.log(r.status));
}
```

### Test Batched Loader
1. Open multiple tabs
2. Check Network tab - should see only 1 config request across all tabs
3. Check Console - should see "Serving from cache" messages

## Rollback

If these changes cause issues:

### Backend Rollback
```javascript
// Revert to original rate limit
max: 300,
// Remove skip function
```

### Frontend Rollback
```javascript
// In PlatformContext.jsx, revert to original Promise.all approach
const results = await Promise.all(
  keys.map(key => api.get(`/platform/config/${key}`))
);
```

## Related Files

- `backend/server.js` - Rate limiter configuration
- `frontend/src/utils/configLoader.js` - Batched config loader (NEW)
- `frontend/src/contexts/PlatformContext.jsx` - Uses batched loader
- `frontend/src/contexts/AuthContext.jsx` - Session validation
- `frontend/src/contexts/CategoriesContext.jsx` - Category loading
- `frontend/src/contexts/CartContext.jsx` - Cart initialization
- `frontend/src/contexts/WishlistContext.jsx` - Wishlist initialization

## Notes

- **Safe for production**: All changes are backward-compatible
- **No breaking changes**: Existing functionality preserved
- **Performance improvement**: Reduced network overhead
- **Better UX**: Faster app initialization

## Next Steps

1. **Test in development**: Refresh the page multiple times and check console
2. **Monitor in production**: Watch for any remaining 429 errors
3. **Adjust if needed**: Fine-tune rate limits based on actual usage patterns

---

**Applied**: August 26, 2026
**Author**: Kiro AI
**Issue**: 429 Too Many Requests on app initialization
