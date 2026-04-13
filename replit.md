# CampusEats Workspace

## Overview

CampusEats is a marketplace-first campus food ordering platform for Kenyan university students. Built as a full-stack SaaS application with three user portals: Student, Vendor, and Admin.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/campuseats)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Routing**: wouter
- **State**: React Query + React Context (auth, cart)

## Architecture

- **Marketplace-first**: Home screen shows food items, NOT vendors
- **10% commission model**: Platform auto-deducts on every order
- **Three portals**: Student (browse/order/track), Vendor (dashboard/orders/menu), Admin (system oversight)
- **Order lifecycle**: pending → paid → preparing → ready → completed
- **Auto-refresh**: Vendor orders page polls every 5s; student order tracking polls every 5s

## Database Schema

Tables: `users`, `vendors`, `menu_items`, `orders`, `order_items`, `transactions`

- Role enum: student | vendor | admin
- Order status enum: pending | paid | preparing | ready | completed | cancelled

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | student@moi.ac.ke | demo123 |
| Vendor | mama@moi.ac.ke | demo123 |
| Vendor 2 | vendor2@moi.ac.ke | demo123 |
| Admin | admin@campuseats.co.ke | admin123 |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/campuseats run dev` — run frontend locally

## Color System

- Primary: Orange #F97316
- Secondary: Green #16A34A
- Accent: Yellow #FACC15
- Danger: Red #EF4444
- Background: #F9FAFB

## API Routes

- `GET /api/marketplace/feed` — unified food marketplace feed
- `GET /api/marketplace/popular` — popular items by order count
- `GET /api/marketplace/categories` — all food categories
- `GET /api/marketplace/stats` — platform stats
- `GET/POST /api/menu` — menu items CRUD
- `GET/POST /api/vendors` — vendor management
- `GET /api/vendors/:id/stats` — vendor earnings & stats
- `GET /api/vendors/:id/orders` — vendor order list
- `GET/POST /api/orders` — order management
- `PUT /api/orders/:id/status` — update order status
- `POST /api/users` — register
- `POST /api/users/login` — login
- `GET /api/admin/stats` — admin dashboard stats
- `GET /api/admin/orders` — all orders (admin)
- `PUT /api/admin/vendors/:id/toggle` — toggle vendor active status
