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
- `CLIENT_ORIGIN` — CORS origin (e.g. `http://localhost:3000`)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — not yet implemented
- `SMTP_*` — not yet implemented

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## Planned but Not Yet Built

- Razorpay checkout and webhook handling
- Reminder cron jobs and email templates
- Post/campaign data-entry UI
- PDF invoice generation
- Performance charts (Recharts is installed but unused)
