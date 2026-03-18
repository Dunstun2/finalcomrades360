---
description: "Use when working on comrades360plus backend/frontend features, API routes/controllers/models, order/payment/delivery flows, role-based dashboards, or Sequelize schema changes."
name: "Comrades Platform Conventions"
applyTo: "**"
---
# Comrades Platform Conventions

## Project Boundaries

- Treat this workspace as a two-app platform plus utility scripts:
- Runtime apps: `backend/` and `frontend/`.
- Root scripts are mostly orchestration and diagnostics; prefer not to place new production business logic in root debug files.
- Backend runtime entrypoint is `backend/server.js` (`backend/app.js` and `backend/index.js` are aliases).

## Backend Conventions

- Keep API endpoints under `/api/*` and register new route modules in `backend/server.js`.
- Follow route -> controller -> model/util layering:
- HTTP contracts in `backend/routes/*`.
- Business logic in `backend/controllers/*`.
- Persistence and associations in `backend/models/*`.
- Shared helpers in `backend/utils/*`.
- Reuse existing auth/RBAC middleware from `backend/middleware/auth.js` for protected endpoints.
- Respect existing status machines and transition rules for orders/payments/delivery; extend transitions explicitly, do not bypass them ad hoc.
- Prefer extending existing domain modules (orders, payments, delivery, marketing, finance) before creating new parallel files.

## Database and Migration Rules

- Development defaults to SQLite (`backend/database.sqlite`), production uses MySQL when DB credentials are present.
- Use Sequelize model updates plus explicit migration scripts for schema changes.
- Keep migrations idempotent and environment-safe (support singular/plural table name edge cases when needed).
- Do not rely on destructive schema operations without a safe rollback or guarded path.

## Frontend Conventions

- Keep API calls on the shared API layer in `frontend/src/services/` (default base is relative `/api`).
- Assume Vite proxy handles backend forwarding in development; avoid hardcoding backend origin URLs in feature code.
- Maintain role-aware routing in `frontend/src/App.jsx` and gate access with `ProtectedRoute` + auth context.
- Keep cross-cutting state in existing contexts (`AuthContext`, `CartContext`, `WishlistContext`, `CategoriesContext`) rather than duplicating global state.
- For realtime behavior, integrate with existing Socket.IO service wrappers instead of creating direct socket clients in page components.

## Testing and Safety

- Prefer adding or updating tests in `backend/test/` when modifying backend behavior.
- Preserve backward-compatible endpoints where legacy routes already exist unless a deliberate deprecation plan is implemented.
- When touching payments, verify idempotency and duplicate-initiation guards.
- When touching order lifecycle logic, verify lock handling and role permissions.

## File Placement

- New migrations: `backend/migrations/`.
- One-off repair scripts: `backend/scripts/`.
- Domain API features: existing route/controller/model domain folders.
- UI pages/components: `frontend/src/pages/` and `frontend/src/components/`.

## Avoid

- Avoid introducing new long-term logic into `debug_*`, `check_*`, `trace_*`, or dump files in root unless there is a clear reason.
- Do not bypass centralized API client/auth interceptors from arbitrary fetch calls in components.
- Do not hardcode secrets or environment-specific credentials in source files.
