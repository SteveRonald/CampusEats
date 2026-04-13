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

## Running Locally

1. Create a PostgreSQL database manually.
2. Run [schema.sql](d:/Projects/CampusEats/database/schema.sql), then optionally [seed.sql](d:/Projects/CampusEats/database/seed.sql).
3. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
4. Start the backend:

```bash
cd backend
npm install
npm run dev
```

5. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Demo Access

The frontend includes a lightweight session switcher for three seeded roles:

- Student: `student@moi.ac.ke`
- Vendor: `mama@moi.ac.ke`
- Admin: `admin@campuseats.co.ke`

## Product Scope

- Marketplace-first food feed
- Popular meals today
- Order again
- Pickup time estimates
- Clear order tracking
- Vendor dashboard with smart auto-refresh
- Admin overview for vendors, orders, and system activity
- IntaSend-compatible simulated payment split and webhook
