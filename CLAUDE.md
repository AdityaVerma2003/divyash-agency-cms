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

`User` ↔ `Client` is many-to-many via the `ClientAssignment` join table (`@@unique([clientId, userId])`) — several team members can be assigned to the same client, and a team member can work on several clients. There is no single "account manager" field on `Client` anymore; always go through `ClientAssignment` (see the Team ↔ Client Assignment section below).

### Backend Module Pattern

Each resource is a self-contained Express router + handler file under `backend/src/modules/` (no separate controller/service/repository layers). All route inputs are validated inline with Zod. Async handlers are wrapped with `asyncHandler` from `src/utils/asyncHandler.ts`; throw `ApiError` from `src/utils/apiError.ts` for 400/401/403/404/409 errors.

### Frontend Structure

- `app/admin/*` — agency admin routes (SUPER_ADMIN, ACCOUNT_MANAGER roles)
- `app/client/*` — client portal routes (CLIENT role only)
- `app/team/*`, `app/services`, `app/work`, `app/blog`, `app/contact`, `app/page.tsx` — public marketing site; all wrapped in shared `components/Nav.tsx` (fixed header, floating WhatsApp FAB) and `components/Footer.tsx` (dark footer, partner badges, client-logo marquee data)
- `app/privacy-policy`, `app/terms-and-conditions`, `app/refund-policy` — legal pages built on `components/LegalDocLayout.tsx`, the shared shell for all legal documents (sticky left-side scroll-spy index + hero + footer). Reuse this layout for any new policy page — see the memory note on legal-pages-format for the full contract.
- `app/team/complete-profile` — forced onboarding step for `ACCOUNT_MANAGER` staff (photo, mobile, address, designation, bank details); gated centrally in `PortalShell.tsx`, which redirects any non-`SUPER_ADMIN` staff whose `onboardingStatus !== "COMPLETE"` here before they can reach `/admin/*`. `SUPER_ADMIN` skips this gate.
- `app/admin/profile` — self-service profile editor for admin staff (photo, designation, contact, bank details) once onboarding is complete
- `components/PortalShell.tsx` — shared sidebar nav, header, role guard, and the onboarding gate described above (redirects to `/login` if unauthenticated/wrong role, or to `/team/complete-profile` if onboarding is incomplete)
- `lib/api.ts` — typed fetch wrapper (get/post/patch/del) that attaches the access token
- `lib/auth.ts` — token management, login/logout, `fetchCurrentUser`
- `lib/clients.ts` — `CLIENT_LOGOS` manifest (public/work-page client logo marquee) — edit names/files here, not inline in `app/page.tsx`
- `lib/designations.ts` — the single shared list of employee `DESIGNATIONS` used by the invite modal, complete-profile, and admin profile pages
- `types/index.ts` — TypeScript interfaces for all API response shapes

### Fonts

Loaded in `app/layout.tsx` via `next/font/google`, exposed as CSS variables and registered in `tailwind.config.ts`:
- `font-sans` → Plus Jakarta Sans (body text)
- `font-display` → Sora (headings, weights 600/700/800, no italic subset loaded — `italic` classes on it render as browser-synthesized oblique, not a true italic cut)
- `font-script` → Lavishly Yours (handwritten/script face, single weight 400) — used sparingly for stylised name treatments (e.g. founder names on `/team`)

### Tailwind Custom Colors

Defined in `frontend/tailwind.config.ts`. The primary brand color is `coral-500` (`#6366F1`, actually indigo — the name is legacy) with `coral-{50,100,400,600,700}` shades; `brand-*` is an alias of the same indigo scale. Landing-page accent colors: `mint` (#2DBFA0 teal), `sky` (#5B7CF7 blue), `rose` (#F87DA3). Portal tokens: `night` (#0E141B sidebar), `canvas`/`ink`/`ash` (page bg/text/muted). Semantic: `success`, `warning`, `danger`.

### Landing Page Animation Vocabulary

Sections on `app/page.tsx` (Why Choose Us, How It Works, Numbers That Speak) and `app/services/page.tsx` share one consistent animated design language — reuse it rather than inventing new patterns:
- Floating background doodles (hand-drawn SVG icons) at low opacity, animated with `animate-float` / `animate-float-slow` / `animate-float-slower` (keyframes in `tailwind.config.ts`)
- A hand-drawn heading underline that draws itself in via `stroke-dasharray`/`stroke-dashoffset` + `animate-draw`, gated on the `useReveal()` intersection-observer hook so it only plays once scrolled into view
- Per-item "icon medallions": a rotating dashed-orbit ring (`animate-spin-slow`) behind a solid icon disc, with a small colored number badge
- Dashed hand-drawn connector arrows between sequential cards/steps (desktop only)
- `useReveal()` (`hooks/useReveal.ts`) + the `.reveal`/`.reveal-delay-N` classes in `globals.css` drive scroll-triggered fade/slide-in staggering everywhere

### Client Logo Assets

`public/DD_CLients_Logo/` holds the original uploaded client-logo source files (~50MB, many are raster PNGs wrapped in SVG) — **not deployed to production, do not reference it directly**. `public/clients/` holds the processed versions actually used on the site (downscaled + converted to WebP where the source was raster, ~1.5MB total), indexed by `lib/clients.ts`.

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (15m) / `JWT_REFRESH_EXPIRES_IN` (7d)
- `CLIENT_ORIGIN` — comma-separated CORS origins (e.g. `http://localhost:3000`)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — Razorpay payment gateway
- `RESEND_API_KEY` — Resend email sending; falls back to console logging when unset
- `RESEND_FROM` — verified sender, e.g. `"Divyash Digital <info@divyashdigital.co.in>"` (domain must be verified in the Resend dashboard, otherwise sends fail or silently downgrade to the `onboarding@resend.dev` sandbox address)
- `RESEND_REPLY_TO` — reply-to address for outgoing mail
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — blog cover image uploads, employee photo uploads

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
- Sent via the Resend SDK (not SMTP/nodemailer); `sendEmail()` falls back to console logging when `RESEND_API_KEY` is unset, so email flows are testable without real credentials
- On send failure, logs the attempted `from` address alongside the Resend error — the most common cause is `RESEND_FROM` pointing at an unverified domain
- `paymentReceiptHtml` / `paymentReceiptSubject` — branded HTML payment receipt
- `invoiceReminderHtml` / `reminderSubject` — styled reminder emails with PRE_DUE (amber), DUE (amber), OVERDUE (red) themes
- The team-invite flow (`backend/src/modules/users.module.ts`) also `console.log`s the raw password-setup link on every invite, regardless of whether the email send succeeds — useful for testing onboarding without waiting on inbox delivery

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

### Team Onboarding
- `POST /api/users` — SUPER_ADMIN invites a teammate with name, email, role (`ACCOUNT_MANAGER`/`SUPER_ADMIN`), a designation picked from `lib/designations.ts`, and `clientIds` (**mandatory, min. 1** — an invite must assign at least one client); creates the user with `onboardingStatus: INVITED`, inserts one `ClientAssignment` row per selected client (additive — never touches any other teammate's existing assignment to those clients), and emails a password-setup link (also logged to console)
- Setting the password (`POST /api/auth/reset-password`) advances `INVITED → PENDING`
- `PATCH /api/users/:id` on `/team/complete-profile` (photo, mobile, address, designation, bank details) advances `PENDING → COMPLETE`
- `SUPER_ADMIN` never goes through this gate — see `PortalShell.tsx`

### Team ↔ Client Assignment (many-to-many via `ClientAssignment`)
- `PATCH /api/users/:id/clients` (SUPER_ADMIN only) — replaces the full list of clients **this teammate** is assigned to (`clientIds`, mandatory, min. 1); scoped strictly by `userId`, so it can never remove a different teammate's assignment to the same client. Used by the "Edit clients" button per team member on `frontend/app/admin/team/page.tsx`.
- `PATCH /api/clients/:clientId/team` (SUPER_ADMIN/ACCOUNT_MANAGER) — replaces the full team roster for **this client** (`userIds`, mandatory, min. 1); scoped strictly by `clientId`. Used by the multi-select checkbox list on the client create/edit forms (`frontend/app/admin/clients/page.tsx`, `[id]/page.tsx`) — client creation also accepts `assignedUserIds` directly in the `POST /api/clients` body (also mandatory).
- `GET /api/clients/:clientId/team-activity` / `GET /api/portal/team-activity` — returns `{ members: [{ member, sessions, totalActiveMinutes }] }`, one entry per assigned team member (not a single assignee); `frontend/app/client/team-activity/page.tsx` renders one activity card per member
- Deleting a teammate (`DELETE /api/users/:id`) or a client cascades/cleans up `ClientAssignment` rows for just that user or client — never the other side's assignments

### Public Website (`app/team`, `app/services`, `app/work`, `app/page.tsx`, `app/blog`, legal pages)
- `/team` — public team page: a static "Meet the Founders" section + a static 5-person team section (both hardcoded arrays in `app/team/page.tsx`, not admin-managed) followed by the dynamic admin-managed team grid from `GET /api/public/team`
- `/work` — two client sections: (1) a curated, hardcoded `PORTFOLIO` array (24 entries, real client logos from `lib/clients.ts`, matched to a case study by fuzzy company-name matching against `GET /api/public/case-studies`), and (2) a DB-backed "Also growing with us" grid from `GET /api/public/clients` — real `Client` rows with `showOnPublicSite: true`, each matched to its case study by `clientId` (no name-matching needed). Either way: no case study yet → disabled "coming soon" state; uploaded → "Download Case Study" button linking straight to the Cloudinary PDF URL.
- `Client.showOnPublicSite` (boolean, default `false`) — set from the admin client create/edit forms; gates whether a client appears in `GET /api/public/clients` **and** whether its case study is exposed via `GET /api/public/case-studies` (a private client's uploaded case study never leaks publicly even if fetched directly)
- Client-logo marquee on the homepage ("Trusted by businesses") and the `/work` curated-portfolio cards both source from the same `lib/clients.ts` manifest — update names/files there once, both places pick it up
- Legal pages (`/privacy-policy`, `/terms-and-conditions`, `/refund-policy`) share `components/LegalDocLayout.tsx` — always use this shell for new policy pages rather than hand-rolling a layout
- `/blog/[slug]` — the post detail page auto-builds a left-side sticky scroll-spy "On this page" index (same visual pattern as `LegalDocLayout`) by walking the post's own rendered `<h2>` headings client-side and assigning them ids; posts with no `<h2>` headings just render without an index, no layout change

### Case Studies (`backend/src/modules/caseStudies.module.ts`)
- `POST /api/admin/case-studies` — multer memory upload, `resource_type: "raw"`, `public_id` **must include the `.pdf` extension** (raw uploads don't auto-append one, and a URL with no/wrong extension breaks in-browser PDF viewing)
- `lib/cloudinary.ts`'s `uploadToCloudinary()` only force-applies the `format: "webp"` + crop transform for `resource_type: "image"` uploads (blog covers, team/employee photos) — never for `"raw"` uploads, since that transform corrupts/mislabels PDFs
- fileFilter rejects non-PDF uploads (checked by both mimetype and filename extension) by throwing `ApiError.badRequest(...)` so it surfaces as a clean 400, not a generic 500
- **Known account-level gotcha (not fixable in code):** if "View PDF" 401s with `{"error":{"message":"deny or ACL failure"}}` even for a correctly-uploaded PDF, the Cloudinary account has "Restricted media types" security enabled, blocking public PDF delivery outright (tested: happens under both `raw` and `image` resource types). Fix is in the Cloudinary Console → Settings → Security → allow PDF/ZIP delivery — no amount of upload-code changes works around it.
