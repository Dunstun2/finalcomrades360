# Comrades360 Plus Backend

The backend API server for the Comrades360 Plus marketplace platform, built with Node.js, Express, and Sequelize ORM.

## Overview

This API provides comprehensive endpoints for managing the entire marketplace ecosystem:

- **User Management**: Registration, authentication, roles, and profile management
- **Products & Categories**: Inventory, variants, recommendations, and search
- **Orders & Payments**: Order lifecycle, payment processing, refunds, and disputes
- **Delivery**: Agent management, task assignment, tracking, and wallet settlement
- **Marketing**: Campaigns, referrals, analytics, and hero promotions
- **Wallets**: Multi-role wallet system with transactions and settlements
- **Fast Food**: Menu management, pickup points, and rapid fulfillment
- **Admin Operations**: Platform configuration, user management, and analytics

## Quick Start

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite:database.sqlite
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
# Additional vars in .env.example
```

## Project Structure

```
backend/
├── controllers/       # Request handlers (authController, orderController, etc.)
├── models/           # Sequelize models (User, Order, Product, Payment, etc.)
├── routes/           # Express route definitions
├── middleware/       # Auth, validation, error handling
├── services/         # Domain business logic
├── modules/          # Feature modules (e.g., relatedProducts)
├── migrations/       # Database schema migrations
├── scripts/          # Database seeds and utilities
├── utils/            # Helper functions
├── cron/             # Background job definitions
├── realtime/         # Socket.IO event handlers
├── test/             # Jest tests
├── uploads/          # User uploads (images, documents)
├── logs/             # Application logs
├── server.js         # Express app initialization
├── database.js       # Database configuration
└── package.json
```

## Key Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user profile

### Orders
- `GET /api/orders` - List user orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Order details
- `PUT /api/orders/:id/status` - Update order status

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product (seller)
- `GET /api/products/:id` - Product details
- `GET /api/products/:id/related` - Related products

### Payments
- `POST /api/payments` - Initiate payment
- `GET /api/payments/:id` - Payment status
- `POST /api/payments/:id/refund` - Request refund

### Delivery
- `GET /api/delivery/tasks` - Delivery agent tasks
- `PUT /api/delivery/tasks/:id/status` - Update delivery status
- `GET /api/delivery/track/:orderId` - Track order delivery

See `routes/` for complete API documentation.

## Database

- **Development**: SQLite (`database.sqlite`)
- **Production**: MySQL (when `DB_HOST`, `DB_USER`, `DB_PASSWORD` are set)

### Running Migrations

```bash
npm run migrate      # Run pending migrations
npm run migrate:undo # Undo last migration
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Real-time Features

Socket.IO events are defined in `realtime/` for:
- Order status updates
- Delivery tracking
- Notifications
- Live menu updates

Connect from frontend with: `io('http://localhost:3000')`

## Cron Jobs

Background jobs run via node-cron:
- Order cleanup
- Payment reconciliation
- Analytics aggregation
- Stock audits

## Database Models

Core entities:
- **User** - Customers, sellers, delivery agents, admins
- **Product** - Inventory with variants
- **Order** & **OrderItem** - Order management
- **Payment** - Payment records and disputes
- **DeliveryTask** - Delivery coordination
- **Wallet** - Balance tracking per role
- **Cart** & **Wishlist** - Customer preferences
- **Campaign** & **Referral** - Marketing features

See `models/` for full schema.

## Middleware

- **auth.js** - JWT verification and role-based access control
- **validation.js** - Request validation with Joi
- **errorHandler.js** - Centralized error handling
- **rateLimiter.js** - Rate limiting for API abuse prevention

## Error Handling

All errors return JSON:

```json
{
  "status": "error",
  "code": 400,
  "message": "Validation failed",
  "errors": [...]
}
```

## Performance

- Request deduplication for identical GET requests
- Caching headers for static assets
- Database query optimization with Sequelize
- Connection pooling for database
- Helmet for security headers

## Contributing

- Place new API endpoints in appropriate `routes/` file
- Add controller logic in `controllers/`
- Update Sequelize model if schema changes needed
- Write tests in `test/`
- Follow naming conventions in `.github/instructions/`

See root `README.md` for more details.

