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
5. Three roles: `SUPER_ADMIN`, `ACCOUNT_MANAGER`, `CLIENT` — enforced via `authenticate` + `authorize` + `scopeToOwnClient` middleware. `ACCOUNT_MANAGER` ("team member") additionally goes through `scopeToAssignedClient` (must have a `ClientAssignment` row for the target client) and `requireReportType` (must have the relevant type in `User.reportTypes`) on report-entry routes — see "Authorization & the Team Workspace" below. **Authorization matrix**: `SUPER_ADMIN`-only — users, services, invoices, billing, payments, blog, case studies, audit log, site settings, `GET /clients`, `GET /clients/:id`, `GET /dashboard/client/:id`, `GET /reports/:id/pdf`, team-activity (all of these also accept the owning `CLIENT` where the data is the client's own). `ACCOUNT_MANAGER` reaches only: `/admin/service-reports` (own assigned clients + own report types), `/workspace/*`, `/tasks` (own/created tasks), `/calendar-events`. When adding a new admin route, default it to `SUPER_ADMIN`-only and widen deliberately — this app has previously had routes that only checked `authenticate` with no role check at all.

### Data Model

The hinge table is `ClientService` — a client's subscription to one service. All invoicing, posts, and campaigns attach to it.

Key entities: `User` → `Client` ↔ `ClientService` ↔ `Service` → `Invoice` / `InvoiceItem` / `Payment` → `Post` / `Campaign` / `Lead` / `Report` (the last four are retired/dormant — see Reporting below). Also hanging off `ClientService`: the six typed report-entry models, each carrying `clientId` (denormalised for team-scoped queries) and `createdById`. Hanging off `User`/`Client` independently: `Task` (+ `TaskAssignee`/`TaskComment`/`TaskAttachment`) and `CalendarEvent` (+ `CalendarEventAttendee`), both with an optional `clientId` that controls client-portal visibility. `SiteSetting` is a single-row table (`id: "singleton"`) holding the maintenance flag and the report month-lock cutoff day.

`User` ↔ `Client` is many-to-many via the `ClientAssignment` join table (`@@unique([clientId, userId])`) — several team members can be assigned to the same client, and a team member can work on several clients. There is no single "account manager" field on `Client` anymore; always go through `ClientAssignment` (see the Team ↔ Client Assignment section below).

### Backend Module Pattern

Each resource is a self-contained Express router + handler file under `backend/src/modules/` (no separate controller/service/repository layers). All route inputs are validated inline with Zod. Async handlers are wrapped with `asyncHandler` from `src/utils/asyncHandler.ts`; throw `ApiError` from `src/utils/apiError.ts` for 400/401/403/404/409 errors.

### Frontend Structure

- `app/admin/*` — agency admin routes, **`SUPER_ADMIN` only** (team members were moved to `/workspace/*`; hitting `/admin/*` as an `ACCOUNT_MANAGER` redirects home via `homePathForRole`, it does not bounce to `/login`)
- `app/workspace/*` — the team-member workspace: `dashboard`, `clients` (list + `[clientId]` detail with the report-entry forms, filtered to the member's own `reportTypes`), `my-reports`, `tasks`, `profile`. Deliberately a separate route group rather than role-conditionals inside `/admin` — see `Team_Dashboard_Plan.pdf`'s rationale if resurrecting this decision. Visually distinguished by the `--accent-workspace` teal (vs. indigo) and a "Workspace" wordmark subtitle, both set via the `variant="workspace"` prop on `PortalShell`.
- `app/client/*` — client portal routes (CLIENT role only)
- `app/team/*`, `app/services`, `app/work`, `app/blog`, `app/contact`, `app/page.tsx` — public marketing site; all wrapped in shared `components/Nav.tsx` (fixed header, floating WhatsApp FAB) and `components/Footer.tsx` (dark footer, partner badges, client-logo marquee data)
- `app/privacy-policy`, `app/terms-and-conditions`, `app/refund-policy` — legal pages built on `components/LegalDocLayout.tsx`, the shared shell for all legal documents (sticky left-side scroll-spy index + hero + footer). Reuse this layout for any new policy page — see the memory note on legal-pages-format for the full contract.
- `app/team/complete-profile` — forced onboarding step for `ACCOUNT_MANAGER` staff (photo, mobile, address, designation, bank details); gated centrally in `PortalShell.tsx`, which redirects any non-`SUPER_ADMIN` staff whose `onboardingStatus !== "COMPLETE"` here before they can reach `/workspace/*`. `SUPER_ADMIN` skips this gate.
- `app/admin/profile` / `app/workspace/profile` — both render the shared `components/ProfileEditor.tsx` (photo, designation read-only, contact, bank details)
- `components/PortalShell.tsx` — shared sidebar nav (grouped, icons, collapsible sub-groups, collapse-to-rail persisted in `localStorage`), sticky header (⌘K command palette via `components/CommandPalette.tsx`, theme toggle, notification bell, user menu), role guard, and the onboarding gate. Takes `navGroups: NavGroup[]` (not a flat list) — each `NavItem` can carry an `icon`, `children` (sub-nav, e.g. Tasks → Kanban/List), and `shellHeader: true` to have the shell render that page's `<h1>` + breadcrumb/subtitle instead of the page doing it itself (only set this on pages that don't already render their own `<h1>`, or you'll get two headings).
- **Portal theme scoping** — `.portal-theme` is a class `PortalShell` puts on its own root, carrying a second, cooler set of the same CSS custom properties (`--page-bg`, `--surface`, `--ink`, etc. — see `app/globals.scss`) plus `.portal-theme .font-display { font-family: var(--font-inter) }`. This is how the admin/workspace/client portals get a different (cool grey, Inter) look from the warm-cream/Jakarta+Sora marketing site **without** touching the global `:root` tokens the marketing site depends on. Never add portal-only styling to `:root` — add it under `.portal-theme` / `.dark .portal-theme` instead.
- `lib/api.ts` — typed fetch wrapper (get/post/patch/del) that attaches the access token
- `lib/auth.ts` — token management, login/logout, `fetchCurrentUser`, `homePathForRole` (SUPER_ADMIN→`/admin`, ACCOUNT_MANAGER→`/workspace`, CLIENT→`/client`)
- `lib/clients.ts` — `CLIENT_LOGOS` manifest (public/work-page client logo marquee) — edit names/files here, not inline in `app/page.tsx`
- `lib/designations.ts` — the single shared list of employee `DESIGNATIONS` used by the invite modal, complete-profile, and admin profile pages. Mirrored server-side by `backend/src/lib/reportTypes.ts`'s `DESIGNATION_REPORT_TYPES`, which maps each designation to its default `reportTypes` (pre-ticked at invite time only — never inferred at runtime from the designation string).
- `types/index.ts` — TypeScript interfaces for all API response shapes; `types/workspace.ts`, `types/tasks.ts`, `types/calendar.ts` — the newer feature areas' types, kept separate rather than growing the one file further

### Fonts

Loaded in `app/layout.tsx` via `next/font/google`, exposed as CSS variables and registered in `tailwind.config.ts`:
- `font-sans` → Plus Jakarta Sans (body text)
- `font-display` → Sora (headings, weights 600/700/800, no italic subset loaded — `italic` classes on it render as browser-synthesized oblique, not a true italic cut)
- `font-script` → Lavishly Yours (handwritten/script face, single weight 400) — used sparingly for stylised name treatments (e.g. founder names on `/team`)
- `font-portal` → Inter (weights 400–700) — **portal only** (admin/workspace/client). Applied automatically inside `.portal-theme`, including overriding `font-display`/Sora there — don't add Inter classes by hand on portal pages, and don't let it leak onto marketing pages.

### Tailwind Custom Colors

Defined in `frontend/tailwind.config.ts`. The primary brand color is `coral-500` (`#6366F1`, actually indigo — the name is legacy) with a full `coral-{50..950}`/`brand-{50..950}` ramp (both the same scale — `brand` and `coral` are aliases). Landing-page accent colors: `mint` (#2DBFA0 teal), `sky` (#5B7CF7 blue), `rose` (#F87DA3). Portal tokens `night`/`canvas`/`ink`/`ash` are legacy and mostly unused now that the portal has its own CSS-custom-property theme (see "Portal theme scoping" above) — don't add new portal styling via these Tailwind colors, use the `var(--ink)` / `var(--surface)` / etc. custom properties instead, which flip automatically between the marketing (`:root`) and portal (`.portal-theme`) palettes. Semantic: `success`, `warning`, `danger`. `boxShadow` extension: `portal-xs/sm/md/lg` — the NextAdmin-style hairline card shadows, used throughout the portal.

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
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — blog cover image uploads, employee photo uploads, task attachments
- `CREDENTIALS_ENCRYPTION_KEY` — 32-byte base64 AES-256-GCM key (`backend/src/lib/crypto.ts`) encrypting client website admin credentials (`WebsiteDevelopmentReportEntry.adminCredentialEnc`). **Rotating this key requires re-encrypting every stored value first** — there's no key-id envelope, so rotating blind makes existing credentials permanently undecryptable. Routes that need it 503 cleanly (via `encryptionAvailable()`) rather than crashing if it's unset.

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

### Reporting (`backend/src/modules/serviceReports.module.ts`, `frontend/app/admin/reporting`, `frontend/app/workspace/clients/[clientId]`)
Per-service performance reporting, replacing the old Posts/Campaigns/Leads data-entry UI and the old weekly `ClientReport` feature (both superseded — their Prisma models/tables are kept in the schema, unused, for historical data; no new rows are written to them). Two entry points share the same forms/endpoint: `/admin/reporting` (SUPER_ADMIN, any client/service) and `/workspace/clients/[clientId]` (ACCOUNT_MANAGER, assigned clients + own report types only, enforced server-side).
- Category → report type mapping (`backend/src/lib/reportTypes.ts`, mirrored in `frontend/lib/reportTypes.ts`): `SMM`→smm, `SEO`→seo, `GOOGLE_ADS`/`META_ADS`/`PERFORMANCE_MARKETING`→paidAds, `WEB_DESIGN`→websiteDevelopment, `GRAPHIC_DESIGN`→graphicDesigning, `CONTENT`→contentCreation. The same file also bridges to the Prisma `ReportType` enum (`SMM`/`SEO`/`PAID_ADS`/`DESIGN`/`CONTENT`/`WEB_DEV`) via `reportTypeToEnum`/`reportTypeFromEnum` — the frontend-facing string keys and the DB enum are deliberately different casings/names, don't conflate them.
- **Not yet supported** (no reporting template defined — pending a field spec): `GOOGLE_MY_BUSINESS`, `LOCAL_SEO`, `BRAND_PROMOTION`, `EVENT_COVERAGE`. Services in these categories show "No reporting template for this service category yet" and are skipped (not faked with zeros) in dashboard per-service metrics.
- Each type has its own Prisma model (`SmmReportEntry`, `SeoReportEntry`, `PaidAdsReportEntry`, `GraphicDesignReportEntry`, `ContentCreationReportEntry`, `WebsiteDevelopmentReportEntry`) keyed by `clientServiceId` (`onDelete: Cascade`) **and** a denormalised `clientId` + `createdById` (nullable — rows that predate authorship tracking have no author, never invent one), a Zod schema + CRUD route in `serviceReports.module.ts` (`/api/admin/service-reports`, gated per-request by `scopeToAssignedClient` + `requireReportType` for non-super-admins), and a `summarize*` aggregation helper in `reportTypes.ts` that produces the client-facing roll-up (shown directly on `/client/dashboard`'s per-service cards, not a separate reports page) — each `summarize*` also returns a zero-fillable monthly series (`reachByMonth`/`leadsByMonth`/`trafficByMonth`/`itemsByMonth`) that feeds the dashboard's per-service mini trend chart.
- **Who may file what**: `User.reportTypes: ReportType[]` is the authoritative permission — set by a SUPER_ADMIN (editable from the Team page), defaulted at invite time from `DESIGNATION_REPORT_TYPES` but never re-derived from the designation string afterward. `requireReportType` enforces it server-side on every mutating route.
- **Month lock** (`backend/src/lib/monthLock.ts`) — `assertMonthEditable()` blocks edits once a reporting month is older than `SiteSetting.reportLockDayOfMonth` (default day 5 of the following month) or covered by an explicit `ReportMonthLock` row (global or per-client). SUPER_ADMIN always bypasses. Called from every create/delete path in `serviceReports.module.ts`.
- **Website Development is a singleton per service** — `POST` upserts the one `WebsiteDevelopmentReportEntry` for that `clientServiceId` rather than appending a new row each time.
- `WebsiteDevelopmentReportEntry.adminCredentialEnc` (site login credentials) is AES-256-GCM ciphertext (`backend/src/lib/crypto.ts`), never selected by list/client-facing queries, and only readable via the audited `POST /api/admin/service-reports/:id/reveal-credentials` (SUPER_ADMIN, or the assigned `WEB_DEV` team member) — every reveal writes a `logAudit` row.
- **Extending with a new type**: add a Prisma model + migration, one entry in `reportTypeForCategory`/`REPORT_TYPES`/`reportTypeToEnum`, a `summarize*` helper, and one `<TypeForm>` component under `frontend/components/reporting/` — the admin page shell, the service-reports router's dispatch, and the dashboard aggregation loop need no changes.

### Tasks (`backend/src/modules/tasks.module.ts`, `frontend/components/tasks/`)
A Kanban board (`TODO`/`IN_PROGRESS`/`REVIEW`/`COMPLETE`) shared by `/admin/tasks` (Kanban) + `/admin/tasks/list` (table) and `/workspace/tasks`, all three rendering the same `components/tasks/TaskBoard.tsx` with an `isAdmin` flag. Drag-and-drop via `@dnd-kit/core` (`PATCH /api/tasks/:id/move`, optimistic with rollback on failure — the move handler re-flows the destination column's `position` values so they stay dense).
- **Visibility**: `SUPER_ADMIN` sees/creates/assigns every task. `ACCOUNT_MANAGER` sees only tasks assigned to them or created by them (`GET /api/tasks`'s `visibilityWhere`), and reassignment/client-linking fields are stripped server-side from their `PATCH` body regardless of what the client sends.
- **Client visibility is opt-in per task** — a `Task.clientId` is what exposes it (read-only, projected fields only) via `GET /api/portal/tasks` to that client's portal (`/client/tasks`). A task with no `clientId` is internal-only. `TaskModal`'s client-link field carries a visible hint about this.
- Comments and file attachments (Cloudinary, any file type) are per-task, loaded via `GET /api/tasks/:id` (not included in the list payload, to keep board loads cheap).

### Calendar (`backend/src/modules/calendarEvents.module.ts`, `frontend/app/admin/calendar`)
Local events only — **no Google Calendar sync**. That's a deliberate, not-yet-built follow-up: it would need the `googleapis` package, OAuth app credentials, a per-user refresh-token store, and `googleEventId`/`source` columns on `CalendarEvent` to dedupe synced vs. local events. None of that exists today.
- Every event is `ONLINE` (needs `meetingUrl`) or `OFFLINE` (needs `location`) — enforced by a Zod `.refine()`, along with `endAt > startAt`.
- Visibility mirrors Tasks: `ACCOUNT_MANAGER` sees events they created or are an attendee of; editing/deleting is creator-or-SUPER_ADMIN only.
- `frontend/components/calendar/MonthGrid.tsx` is a real month grid (native `Date` math, no date library). Week/Day views are simpler chronological lists rather than full grids; Year is a 12-tile overview with per-month event counts — all three were scoped down relative to Month to keep the build tractable, revisit if the simplified views prove insufficient.
- The admin dashboard's "Upcoming Tasks & Meetings" rail and the workspace dashboard's "Upcoming meetings" both read from this same `CalendarEvent` table.

### Maintenance Mode (`backend/src/modules/siteSettings.module.ts`, `frontend/middleware.ts`, `frontend/app/admin/maintenance`)
A `SiteSetting.maintenanceEnabled` flag, flipped from `/admin/maintenance` (SUPER_ADMIN, behind a confirm step since it's disruptive) via `PATCH /api/admin/settings/maintenance`. `GET /api/public/site-settings` is deliberately unauthenticated and cheap (short `Cache-Control`) — it's polled by `frontend/middleware.ts` on every request.
- **What goes down**: the public marketing site and `/client/*`. **What stays up**: `/admin/*`, `/workspace/*`, `/team/*` (onboarding), `/login`, `/maintenance` itself. The middleware can't distinguish "logged-in client" from "anonymous visitor" (auth is a `localStorage` token, invisible to Edge middleware) — that's fine, both are meant to go down together by design.
- Fails open: if the settings fetch errors or times out, the middleware treats maintenance as off rather than taking the whole site down over a transient backend hiccup.
- `SiteSetting.reportLockDayOfMonth` (see the Reporting section's month lock) lives on this same singleton row and is editable via `PATCH /api/admin/settings/report-lock` — it's bundled here because it's the only other site-wide setting, not because it's conceptually about maintenance.

### Portal Design System (`frontend/app/globals.scss`, `frontend/components/portal/`, `frontend/components/PortalShell.tsx`)
The admin/workspace/client portals were rebuilt to a NextAdmin-style look: light 270px collapsible sidebar (grouped nav with icons, collapse state in `localStorage`), sticky header with a working ⌘K command palette (`frontend/components/CommandPalette.tsx`, nav-jump only — no backend search), cool-grey flat hairline cards, Inter type. See "Portal theme scoping" under Frontend Structure for how this avoids touching the marketing site's tokens.
- Shared primitives in `frontend/components/portal/`: `Card`/`CardHeader`, `StatQuad`/`StatCard`/`KpiDelta` (the 2×2/4-up KPI grid with a `—` fallback when there's no prior-period figure to compute a delta from — **never fabricate a percentage**), `SegmentedControl`, `PeriodSelect`, `Avatar`/`AvatarStack`, `PriorityBadge`, `EmptyState`, `LinkOrDiv` (a `Link`-or-`div` wrapper; needed because a `Link | "div"` union doesn't typecheck as a JSX tag directly).
- All three dashboards (`/admin/dashboard`, `/workspace/dashboard`, `/client/dashboard`) are built from these same primitives so they read as one product despite very different data: the admin one shows revenue/invoices, the workspace one is contractually money-free (asserted by what fields `GET /api/workspace/dashboard` selects, not just hidden in the UI), the client one shows only that client's own spend.
- `backend`'s `GET /api/dashboard/admin` KPIs compare a period against the immediately-preceding period of equal length (`resolvePeriod` in `dashboard.module.ts`) and return `deltaPct: null` rather than a number when the prior period's value is zero.

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
