# Comrades360 Plus Platform

A comprehensive, full-stack **e-commerce and delivery platform** designed for multi-role marketplaces. Comrades360 Plus connects customers, sellers, delivery agents, marketers, and admin operators in a unified ecosystem for buying, selling, and delivering goods with real-time tracking and advanced marketplace features.

## About the Project

Comrades360 Plus is a production-ready platform built with modern web technologies, supporting:

- **Multi-vendor marketplace** with seller registration, product management, and commission handling
- **Order lifecycle management** with status transitions and supply chain tracking
- **Fast-food integration** with pickup points and delivery coordination
- **Payment processing** with multiple payment methods, refunds, and wallet systems
- **Real-time features** including order tracking, notifications, and live menu updates
- **Role-based access control** for customers, sellers, delivery agents, marketers, finance managers, and super admins
- **Marketing & referral system** for customer acquisition and engagement
- **Advanced inventory management** with stock reservations and audit logs
- **Finance & analytics dashboards** for platform, seller, and superadmin insights

## Key Features

- **Order Management**: Full order lifecycle with automated state transitions, delivery tracking, and handover codes
- **Wallet System**: Multi-wallet support for customers, sellers, delivery agents, and service providers
- **Delivery Coordination**: Real-time delivery agent assignment, route optimization, and performance tracking
- **Fast Food Module**: Specialized fast-food ordering with menu variants, combos, and rapid pickup fulfillment
- **Product Recommendations**: AI-based related product suggestions using multi-factor categorization
- **Two-Factor Authentication**: Enhanced security for user accounts
- **Image Processing**: Optimized image handling with Sharp for multiple resolutions
- **WebSocket Integration**: Real-time updates using Socket.IO

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: SQLite (development), MySQL (production) via Sequelize ORM
- **Real-time**: Socket.IO for WebSocket support
- **Authentication**: JWT with bcryptjs password hashing
- **File Handling**: Multer for uploads, Sharp for image processing
- **Task Scheduling**: Node-cron for background jobs
- **Caching**: Redis integration (optional)

### Frontend
- **Framework**: React 18 with Vite bundler
- **Styling**: TailwindCSS with custom utilities
- **UI Components**: Radix UI primitives, custom components
- **Forms**: React Hook Form with Yup/Zod validation
- **HTTP Client**: Axios with custom interceptors
- **Real-time**: Socket.IO Client
- **Maps**: Leaflet with React Leaflet for delivery tracking
- **State Management**: React Context API with custom hooks

## Structure

- `backend/` — Node.js API, business logic, database models, migrations, and Sequelize configuration
- `frontend/` — React web app with pages, components, hooks, and services (Vite)
- `config/` — Shared configuration files
- `dev-tools/` — Debug, check, trace, and helper scripts (not for production)
- `.github/` — Contribution guidelines and development instructions

## Project Organization

```
Comrades360-plus/
├── backend/
│   ├── controllers/      # Business logic handlers
│   ├── models/           # Sequelize ORM models (Order, Payment, User, etc.)
│   ├── routes/           # API endpoint definitions
│   ├── middleware/       # Auth, RBAC, error handling
│   ├── services/         # Domain-specific business services
│   ├── modules/          # Feature modules (e.g., relatedProducts)
│   ├── migrations/       # Database schema migrations
│   ├── scripts/          # Utility scripts for maintenance
│   ├── test/             # Unit and e2e tests
│   ├── uploads/          # User-uploaded files (images, documents)
│   └── database.sqlite   # Development SQLite database
├── frontend/
│   ├── src/
│   │   ├── pages/        # Route pages (Home, Cart, Orders, etc.)
│   │   ├── components/   # Reusable React components
│   │   ├── contexts/     # Global state (Auth, Cart, Wishlist, etc.)
│   │   ├── services/     # API client and service wrappers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Helper utilities
│   │   └── styles/       # Global styles and configuration
│   ├── public/           # Static assets
│   └── dist/             # Production build output
├── docs/                 # Project documentation
└── dev-tools/            # Development and debugging utilities
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dunstun2/Comrades360-plus.git
   cd Comrades360-plus
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development servers** (frontend on :4000, backend on :3000)
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Development Guidelines

- Follow the conventions in `.github/instructions/comrades-platform.instructions.md`
- Keep API endpoints organized under `/api/*` in routes
- Maintain route → controller → model layering
- Use existing auth middleware from `backend/middleware/auth.js`
- Add/update tests in `backend/test/` when modifying core logic
- Respect order/payment/delivery state machines; don't bypass transitions
- Use existing context providers instead of creating new global state

## Contributing

We welcome contributions! Please follow these guidelines to help maintain code quality and consistency.

### Code of Conduct

- Be respectful and inclusive in all interactions
- Provide constructive feedback
- Report issues responsibly
- Help other contributors succeed

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork locally**
   ```bash
   git clone https://github.com/your-username/Comrades360-plus.git
   cd Comrades360-plus
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

4. **Set up development environment**
   ```bash
   npm run install:all
   npm run dev
   ```

5. **Make your changes** following the guidelines below

### Development Workflow

#### Branch Naming Convention
- `feature/` - New features (e.g., `feature/order-tracking`)
- `fix/` - Bug fixes (e.g., `fix/payment-validation`)
- `refactor/` - Code refactoring (e.g., `refactor/api-client`)
- `docs/` - Documentation (e.g., `docs/api-endpoints`)
- `test/` - Test additions (e.g., `test/order-controller`)

#### Commit Messages
Follow conventional commits format:

```
feat(scope): description      # New feature
fix(scope): description       # Bug fix
docs(scope): description      # Documentation
style(scope): description     # Code style (formatting, missing semicolons, etc.)
refactor(scope): description  # Code refactoring
test(scope): description      # Adding/updating tests
chore(scope): description     # Build, dependencies, etc.
```

Examples:
```
feat(orders): add order tracking webhook
fix(payment): handle concurrent payment requests
docs(backend): update API endpoint documentation
test(auth): add 2FA verification tests
```

### Code Guidelines

#### Backend (Node.js/Express)

✅ **DO:**
- Place API endpoints under `/api/*` in routes
- Follow route → controller → model layering
- Reuse existing auth middleware (`backend/middleware/auth.js`)
- Add validation for all request inputs
- Keep functions focused and testable
- Use meaningful variable and function names
- Add JSDoc comments to complex functions
- Handle errors consistently

❌ **DON'T:**
- Bypass centralized authentication
- Create parallel domain modules (extend existing ones)
- Hardcode secrets or configuration
- Mix business logic into route handlers
- Ignore state machine transitions for orders/payments/delivery

Example API endpoint:
```javascript
// routes/orderRoutes.js
router.post('/:orderId/cancel', authenticate, orderController.cancelOrder);

// controllers/orderController.js
exports.cancelOrder = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByPk(orderId);
    // Validate state transition
    if (!order.canTransitionTo('cancelled')) {
      return res.status(400).json({ error: 'Invalid state transition' });
    }
    await order.updateStatus('cancelled');
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};
```

#### Frontend (React/Vite)

✅ **DO:**
- Keep components focused and reusable
- Use hooks (useState, useEffect, useContext, custom hooks)
- Keep API calls in `services/` directory
- Use existing context providers for global state
- Maintain responsive design with TailwindCSS
- Optimize images with provided utilities
- Use meaningful component names

❌ **DON'T:**
- Create new global state context (use existing ones)
- Make API calls directly in components
- Hardcode backend URLs
- Ignore accessibility standards
- Create large, multi-purpose components

Example component:
```jsx
// src/components/OrderCard.jsx
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function OrderCard({ order }) {
  const { user } = useContext(AuthContext);
  
  const handleCancel = async () => {
    try {
      await api.put(`/orders/${order.id}/cancel`);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3>{order.id}</h3>
      <button onClick={handleCancel}>Cancel Order</button>
    </div>
  );
}
```

### Testing

- **Backend**: Add unit tests in `backend/test/` for new features
  ```bash
  npm test              # Run tests
  npm run test:watch   # Watch mode
  ```

- **Frontend**: Update tests when modifying components or hooks

- **Manual Testing**: Test the complete flow in dev environment before submitting PR

### Documentation

Update or create documentation for:
- New API endpoints (document in README or endpoint comments)
- Database schema changes (update migration files)
- New features or major changes (add to `/docs/`)
- Complex logic (add code comments and JSDoc)

### Database Changes

- Create migration files in `backend/migrations/`
- Make migrations **idempotent** (safe to run multiple times)
- Test migrations on both SQLite and MySQL if possible
- Avoid destructive operations without rollback support

Example migration:
```javascript
// migrations/[timestamp]-add-order-tracking.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Orders', 'trackingCode', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Orders', 'trackingCode');
  },
};
```

### Pull Request Process

1. **Before submitting**, ensure:
   - Your branch is up-to-date with `main`
   - All tests pass locally
   - Code follows project conventions
   - Commit messages are clear and descriptive

2. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what was changed and why
   - Reference to any related issues (e.g., `Fixes #123`)
   - Screenshots/videos if UI changes
   - Testing steps for reviewers

3. **PR Title Format**:
   ```
   feat: Add real-time order status updates
   fix: Resolve payment amount calculation error
   docs: Update API documentation
   ```

4. **Wait for review** - A maintainer will review your code
   - Address feedback and request changes promptly
   - Push additional commits to the same branch
   - Don't force-push once a PR is under review

5. **Merge** - Once approved, your PR will be merged

### For Maintainers

- Code reviews focus on functionality, security, and maintainability
- Approve PRs that align with project goals and quality standards
- Request changes before merging if needed
- Use squash merge for cleaner history when appropriate

### Reporting Issues

- Check existing issues before creating a new one
- Provide clear title and description
- Include:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment (Node version, browser, OS)
  - Relevant code snippets or screenshots

### Questions?

- Check existing documentation in `/docs/`
- Read the platform conventions file: `.github/instructions/comrades-platform.instructions.md`
- Ask in issues or open a discussion

Thank you for contributing to Comrades360 Plus! 🙏

## Database & Migrations

- Development uses SQLite (`backend/database.sqlite`)
- Production uses MySQL when `DB_*` credentials are set
- Place migrations in `backend/migrations/`
- Migrations must be idempotent and environment-safe

## License

MIT License - See LICENSE file for details
