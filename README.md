# Shakra Perfume - Production eCommerce Platform

This project keeps the existing Shakra luxury UI while upgrading architecture to a real full-stack platform.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + JWT + Zod + Helmet + Rate Limit
- Database: PostgreSQL (`server/schema.sql`)
- Admin: `/admin` dashboard with protected APIs

## Core Features

- Product CRUD (with stock, pricing, notes, featured/published)
- Categories CRUD
- Orders management and status flow
- Customer management (ban/delete/search)
- Customer auth (register/login) with hashed passwords
- Customer account endpoint (`/api/customer/me`)
- Wishlist APIs
- Checkout API with `3 JOD` fixed delivery fee
- EN/AR translation management
- Branding/content/settings management
- Admin image upload API (`/api/admin/upload`) and static serving from `/uploads/*`
- Analytics endpoint (`/api/admin/analytics`)

## Project Structure

- `src/` storefront and admin UI
- `server/index.ts` Express API
- `server/db.ts` PostgreSQL pool
- `server/schema.sql` schema and indexes
- `public/` static assets, logos, SEO files

## Environment Setup

Copy `.env.example` to `.env` and set secure values:

- `JWT_SECRET`
- `CUSTOMER_JWT_SECRET`
- `DATABASE_URL`
- `DATABASE_SSL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `VITE_APP_DOMAIN`
- `VITE_API_URL`

## Local Run

```bash
npm install
psql "$DATABASE_URL" -f server/schema.sql
npm run server
npm run dev
```

Frontend runs on `http://localhost:5173` and API on `http://localhost:8787`.

## Build & Validation

```bash
npm run typecheck
npm run build
```

## API Surface (high level)

- Public: `/api/products`, `/api/products/:slug`, `/api/categories`, `/api/checkout`, `/api/newsletter`
- Customer auth: `/api/auth/register`, `/api/auth/login`
- Customer protected: `/api/customer/me`, `/api/customer/wishlist/:productId`
- Admin auth: `/api/admin/auth/login`
- Admin protected: bootstrap, analytics, products, categories, orders, customers, content, settings, translations, upload

## Deployment

### Frontend (Vercel / Netlify)
- Build command: `npm run build`
- Output dir: `dist`
- SPA rewrites are included in `vercel.json` and `public/_redirects`.

### Backend (Render / Railway / Fly / VPS)
- Start command: `npm run server`
- Set all env vars from `.env.example`
- Provision PostgreSQL and run schema migration.

### Supabase/Neon PostgreSQL
- Use hosted `DATABASE_URL`
- Keep `DATABASE_SSL=true` in production.

## Default Admin Seed

Created automatically on API boot if not found:

- Email: value of `ADMIN_EMAIL`
- Password: value of `ADMIN_PASSWORD`

Change both in production before launch.
