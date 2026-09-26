# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Divyash Digital Agency CMS — a dual-portal platform for a digital marketing agency. Agency admins manage clients, service subscriptions, and billing; clients view their subscribed services, performance stats, and invoices.

**Stack**: Next.js 14 (App Router) frontend + Express/TypeScript backend + Prisma + PostgreSQL.

## Commands

### Infrastructure

```bash
docker compose up -d        # start PostgreSQL 16 on localhost:5432
```

### Backend (`/backend`)

```bash
npm run dev                 # tsx watch src/server.ts — hot reload on port 4000
npm run build               # tsc → dist/
npm run start               # node dist/server.js
npm run prisma:generate     # regenerate Prisma client after schema changes
npm run prisma:migrate      # apply migrations (dev)
npm run prisma:studio       # GUI database browser
npm run seed                # seed demo admin + client + posts + invoice
```

### Frontend (`/frontend`)

```bash
npm run dev                 # next dev on port 3000
npm run build               # next build
npm run lint                # next lint (ESLint via Next.js built-in)
```

**No test suite is configured** in either app.

## Architecture

```
Browser → Next.js :3000 → Express API :4000 → PostgreSQL :5432
```

### Auth Flow

1. `POST /api/auth/login` returns a short-lived access token (JWT, 15 min) in the response body and sets an httpOnly refresh token cookie (7 days).
2. The frontend stores the access token in `localStorage` under `divyash_access_token`.
3. All API calls attach `Authorization: Bearer <token>`.
4. `POST /api/auth/refresh` reads the cookie and issues a new access token.
5. Three roles: `SUPER_ADMIN`, `ACCOUNT_MANAGER`, `CLIENT` — enforced via `authenticate` + `authorize` + `scopeToOwnClient` middleware.

### Data Model

The hinge table is `ClientService` — a client's subscription to one service. All invoicing, posts, and campaigns attach to it.

Key entities: `User` → `Client` ↔ `ClientService` ↔ `Service` → `Invoice` / `InvoiceItem` / `Payment` → `Post` / `Campaign` / `Lead` / `Report`.

### Backend Module Pattern

Each resource is a self-contained Express router + handler file under `backend/src/modules/` (no separate controller/service/repository layers). All route inputs are validated inline with Zod. Async handlers are wrapped with `asyncHandler` from `src/utils/asyncHandler.ts`; throw `ApiError` from `src/utils/apiError.ts` for 400/401/403/404/409 errors.

### Frontend Structure

- `app/admin/*` — agency admin routes (SUPER_ADMIN, ACCOUNT_MANAGER roles)
- `app/client/*` — client portal routes (CLIENT role only)
- `components/PortalShell.tsx` — shared sidebar nav, header, and role guard (redirects to `/login` if unauthenticated or wrong role)
- `lib/api.ts` — typed fetch wrapper (get/post/patch/del) that attaches the access token
- `lib/auth.ts` — token management, login/logout, `fetchCurrentUser`
- `types/index.ts` — TypeScript interfaces for all API response shapes

### Tailwind Custom Colors

Defined in `frontend/tailwind.config.ts`: `ink` (#101828 dark), `brand-{50,100,500,600,700}` (blue), `success` (green), `warning` (amber), `danger` (red).

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (15m) / `JWT_REFRESH_EXPIRES_IN` (7d)
- `CLIENT_ORIGIN` — comma-separated CORS origins (e.g. `http://localhost:3000`)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — Razorpay payment gateway
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — email sending (console fallback when unconfigured)
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — blog cover image uploads

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## Key Implemented Features

### Razorpay Payment Flow (`backend/src/modules/razorpay.module.ts`)
- `POST /api/razorpay/orders` — creates a Razorpay order for an invoice's outstanding balance (amount in paise)
- `POST /api/razorpay/verify` — 9-step server-side verification: HMAC-SHA256 signature check, idempotency guard with cross-invoice validation, server-to-server payment fetch, order notes match, payment status check, amount validation (±₹1 tolerance), then records payment
- `POST /api/razorpay/webhook` — handles `payment.captured` events with webhook secret HMAC validation and idempotency skip
- Shared `recordRazorpayPayment` helper used by both verify and webhook handlers
- **Not yet built**: frontend Razorpay checkout modal/button in the client invoice view

### Cron Jobs & Automated Billing (`backend/src/lib/cron.ts`, `backend/src/lib/billing.ts`)
- `0 9 1 * *` — monthly invoice generation on the 1st of each month at 9am; groups active MONTHLY subscriptions by client, skips if already billed for the period
- `0 8 * * *` — daily invoice reminders at 8am; marks overdue invoices, sends PRE_DUE (3 days before), DUE (on due date), OVERDUE emails with deduplication via `ReminderLog`
- `5 8 * * *` — daily contract expiry check at 8:05am; notifies on services ending within 14 days
- Manual triggers via `POST /api/billing/run` and `POST /api/billing/send-reminders` (SUPER_ADMIN only)

### Email (`backend/src/lib/email.ts`, `backend/src/lib/emailTemplates.ts`)
- SMTP transporter supporting port 465 (SSL) and 587 (STARTTLS); falls back to console logging when SMTP env vars are not set
- `paymentReceiptHtml` / `paymentReceiptSubject` — branded HTML payment receipt
- `invoiceReminderHtml` / `reminderSubject` — styled reminder emails with PRE_DUE (amber), DUE (amber), OVERDUE (red) themes

### PDF Generation (PDFKit)
- **Invoice PDF**: `GET /api/invoices/:id/pdf` — dynamic-height PDFKit document with line items, payment history, balance due
- **Monthly Performance Report**: `GET /api/reports/:clientId/pdf?month=YYYY-MM` — active services table, billing summary KPI grid, social media performance, ad campaign performance (ROAS, CTR, cost/conv), leads & revenue; logs to `Report` table

### Blog (Cloudinary + Multer)
- Public router at `/api/blog-posts` — paginated published posts with optional `?category=` filter; per-post cache headers
- Admin router at `/api/admin/blog-posts` — full CRUD (create draft, update, publish, delete); auto-generated unique slugs
- `POST /api/admin/blog-posts/:id/cover-image` — multer memory storage → Cloudinary upload (WebP auto-format, 1200×630 crop limit); replaces old image on update

### Data-Entry UI (admin client detail page)
- **Posts** (`frontend/app/admin/clients/[id]/page.tsx`): table with AddPostModal (platform, date, reach/likes/comments/shares, optional URL) and delete
- **Campaigns**: table with AddCampaignModal (month, spend, impressions, clicks, conversions, ROAS) and delete
- **Leads**: table with AddLeadModal (month, count, revenue attributed) and delete

### Performance Charts (Recharts)
- `AreaChart` — 6-month reach trend on client dashboard (`frontend/app/client/dashboard/page.tsx`)
- `BarChart` — 6-month leads trend on client dashboard
