# Divyash Digital — Agency CMS

A production-track client/admin portal for a digital marketing agency:

- **Agency admin panel** — clients, service subscriptions, revenue, invoicing, payment reminders.
- **Client portal** — services subscribed, performance per service, reach per post, leads generated, invoices, online payment.

Monorepo with two apps:

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL (REST API)
frontend/   Next.js (App Router) + TypeScript + Tailwind
```

## Architecture

```
Browser (admin & client) → Next.js frontend → Node.js API → PostgreSQL
                                                   ├── Razorpay (payments)
                                                   ├── Email + cron (reminders)
                                                   └── Cloud storage (media, PDFs)
```

See `backend/prisma/schema.prisma` for the full data model. The hinge table is
`ClientService` (a client's subscription to a service) — revenue, invoices,
posts, and campaigns all hang off it.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or your own Postgres instance

## 1. Database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already wired
into `backend/.env.example`.

## 2. Backend API

```bash
cd backend
cp .env.example .env      # fill in JWT secrets, Razorpay keys, SMTP creds later
npm install
npm run prisma:migrate    # creates tables from schema.prisma
npm run seed               # optional: creates a demo admin + client + data
npm run dev                 # http://localhost:4000
```

Demo login after seeding (see `prisma/seed.ts`):

- Admin — `admin@divyashdigital.co.in` / `Admin@123`
- Client — `client@example.com` / `Client@123`

## 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # points to the backend API URL
npm install
npm run dev                    # http://localhost:3000
```

## What's scaffolded vs. what's next

**Scaffolded (this pass):**
- Full Prisma schema for every entity (users, clients, services,
  subscriptions, invoices, payments, reminders, posts, campaigns, leads,
  reports, audit logs, notifications)
- JWT auth (access + refresh) with role-based middleware
  (`SUPER_ADMIN` / `ACCOUNT_MANAGER` / `CLIENT`)
- CRUD APIs for clients, services, client-service subscriptions, invoices
- Admin and client dashboard summary endpoints
- Next.js app shell: login page, admin layout + dashboard + client list,
  client layout + dashboard, shared API client and auth helpers

**Not built yet (next phases):**
- Invoice auto-generation on billing cycle + Razorpay checkout/webhook
- Reminder cron jobs and email templates
- Post/campaign data entry UI and client-facing charts
- PDF invoice/report generation
- Polished visual design pass on the dashboards (currently functional, not final UI)

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Never commit real
secrets — `.env` is gitignored.
