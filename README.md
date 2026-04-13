# CampusEats

CampusEats is a marketplace-first campus food ordering platform for Kenyan university students. This workspace follows the requested production-ready structure:

- `frontend/` - Next.js student, vendor, and admin interfaces
- `backend/` - Express REST API for marketplace, orders, vendors, payments, and webhook handling
- `database/` - raw PostgreSQL SQL schema and seed data
- `shared/` - shared contracts and product constants

## Stack

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js + Express.js
- Database: PostgreSQL with raw SQL only
- Payments: IntaSend-compatible simulated checkout and webhook flow

## Product Scope

- Marketplace-first food feed
- Popular meals today
- Order again
- Pickup time estimates
- Clear order tracking
- Vendor dashboard with smart auto-refresh
- Admin overview for vendors, orders, and system activity
- IntaSend-compatible simulated payment split and webhook
