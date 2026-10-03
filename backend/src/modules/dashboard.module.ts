import { Router } from "express";
import { ClientStatus, InvoiceStatus, Role, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { reportTypeForCategory } from "../lib/reportTypes";
import { buildSummary } from "./serviceReports.module";

const router = Router();
router.use(authenticate);

type DashboardPeriod = "this_month" | "last_month" | "this_quarter" | "this_year";

/**
 * Resolves a period to its own window plus the directly-preceding window of
 * equal shape, so deltas compare like with like.
 */
function resolvePeriod(period: DashboardPeriod, now: Date) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const utc = (yy: number, mm: number, dd = 1) => new Date(Date.UTC(yy, mm, dd));

  switch (period) {
    case "last_month":
      return { from: utc(y, m - 1), to: utc(y, m), prevFrom: utc(y, m - 2), prevTo: utc(y, m - 1) };
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: utc(y, q), to: utc(y, q + 3), prevFrom: utc(y, q - 3), prevTo: utc(y, q) };
    }
    case "this_year":
      return { from: utc(y, 0), to: utc(y + 1, 0), prevFrom: utc(y - 1, 0), prevTo: utc(y, 0) };
    case "this_month":
    default:
      return { from: utc(y, m), to: utc(y, m + 1), prevFrom: utc(y, m - 1), prevTo: utc(y, m) };
  }
}

/**
 * Percentage change, or null when there's no prior-period baseline. The UI
 * renders null as "—" rather than inventing a number.
 */
function deltaPct(value: number, prevValue: number): number | null {
  if (prevValue === 0) return null;
  return ((value - prevValue) / prevValue) * 100;
}

function monthKeyUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// GET /api/dashboard/admin — agency-wide overview
router.get(
  "/admin",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const periodParam = (req.query.period as DashboardPeriod | undefined) ?? "this_month";
    const rangeMonths = Math.min(Math.max(Number(req.query.range) || 6, 3), 12);
    const { from, to, prevFrom, prevTo } = resolvePeriod(periodParam, now);

    const [
      totalClients,
      activeSubscriptions,
      outstandingInvoices,
      overdueInvoices,
      paidThisMonth,
      suspendedClients,
      contractsEndingSoon,
      monthlyRecurringRevenue,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.clientService.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.invoice.aggregate({
        where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { amount: true },
      }),
      prisma.client.count({ where: { status: ClientStatus.SUSPENDED } }),
      prisma.clientService.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: now, lte: in14Days },
        },
        select: {
          id: true,
          endDate: true,
          service: { select: { name: true } },
          client: { select: { id: true, companyName: true } },
        },
      }),
      prisma.clientService.aggregate({
        where: { status: SubscriptionStatus.ACTIVE, billingCycle: "MONTHLY" },
        _sum: { rate: true },
      }),
    ]);

    const outstandingAmount = Number(outstandingInvoices._sum.totalAmount ?? 0);
    const revenueThisMonth  = Number(paidThisMonth._sum.amount ?? 0);

    // ── CRM KPI quad: value + same-shape prior window, so deltas are real ──
    const [
      revenueNow, revenuePrev,
      contractsNow, contractsPrev,
      clientsNow, clientsPrev,
      invoicesNow, invoicesPrev,
    ] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "SUCCESS", paidAt: { gte: from, lt: to } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS", paidAt: { gte: prevFrom, lt: prevTo } }, _sum: { amount: true } }),
      prisma.clientService.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.clientService.count({ where: { createdAt: { gte: prevFrom, lt: prevTo } } }),
      prisma.client.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.client.count({ where: { createdAt: { gte: prevFrom, lt: prevTo } } }),
      prisma.invoice.count({ where: { issuedDate: { gte: from, lt: to }, status: { not: InvoiceStatus.DRAFT } } }),
      prisma.invoice.count({ where: { issuedDate: { gte: prevFrom, lt: prevTo }, status: { not: InvoiceStatus.DRAFT } } }),
    ]);

    const kpi = (value: number, prevValue: number) => ({
      value,
      prevValue,
      deltaPct: deltaPct(value, prevValue),
    });

    // ── Lead growth & conversion, bucketed by reporting month ─────────────
    // Paid-ads entries store a reporting month (not a date), which is why the
    // UI offers month ranges rather than 7/30/90-day windows.
    const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (rangeMonths - 1), 1));
    const paidAdsRows = await prisma.paidAdsReportEntry.findMany({
      where: { month: { gte: trendStart } },
      select: { month: true, leads: true, leadsConverted: true },
    });
    const leadBuckets: Record<string, { leads: number; converted: number }> = {};
    for (const row of paidAdsRows) {
      const key = monthKeyUTC(row.month);
      if (!leadBuckets[key]) leadBuckets[key] = { leads: 0, converted: 0 };
      leadBuckets[key].leads += row.leads ?? 0;
      leadBuckets[key].converted += row.leadsConverted ?? 0;
    }
    const leadTrend: { month: string; leads: number; converted: number }[] = [];
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = monthKeyUTC(d);
      leadTrend.push({ month: key, ...(leadBuckets[key] ?? { leads: 0, converted: 0 }) });
    }

    // ── Upcoming tasks & meetings, and recent activity ────────────────────
    const [upcomingEvents, upcomingTasks, auditRows, taskComments] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { endAt: { gte: now } },
        orderBy: { startAt: "asc" },
        take: 6,
        select: {
          id: true, title: true, startAt: true, endAt: true, mode: true, allDay: true,
          client: { select: { id: true, companyName: true } },
          attendees: { select: { user: { select: { id: true, name: true, photoUrl: true } } } },
        },
      }),
      prisma.task.findMany({
        where: { status: { not: "COMPLETE" }, dueDate: { not: null } },
        orderBy: { dueDate: "asc" },
        take: 6,
        select: {
          id: true, title: true, dueDate: true, priority: true, status: true,
          client: { select: { id: true, companyName: true } },
          assignees: { select: { user: { select: { id: true, name: true, photoUrl: true } } } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true, action: true, entity: true, createdAt: true, meta: true,
          user: { select: { id: true, name: true, photoUrl: true } },
        },
      }),
      prisma.taskComment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, body: true, createdAt: true,
          user: { select: { id: true, name: true, photoUrl: true } },
          task: { select: { id: true, title: true } },
        },
      }),
    ]);

    const recentActivity = [
      ...auditRows.map((row) => ({
        id: `audit-${row.id}`,
        kind: "audit" as const,
        actor: row.user,
        action: row.action,
        subject: row.entity,
        body: null as string | null,
        createdAt: row.createdAt,
      })),
      ...taskComments.map((row) => ({
        id: `comment-${row.id}`,
        kind: "comment" as const,
        actor: row.user,
        action: "COMMENTED",
        subject: row.task.title,
        body: row.body,
        createdAt: row.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    res.json({
      // existing fields — other UI still reads these
      totalClients,
      activeSubscriptions,
      monthlyRecurringRevenue: Number(monthlyRecurringRevenue._sum.rate ?? 0),
      revenueThisMonth,
      outstandingAmount,
      overdueInvoiceCount: overdueInvoices,
      suspendedClients,
      contractsEndingSoon: contractsEndingSoon.map((cs) => ({
        id: cs.id,
        endDate: cs.endDate,
        serviceName: cs.service.name,
        clientId: cs.client.id,
        clientName: cs.client.companyName,
      })),
      // CRM additions
      period: periodParam,
      range: rangeMonths,
      kpis: {
        revenue: kpi(Number(revenueNow._sum.amount ?? 0), Number(revenuePrev._sum.amount ?? 0)),
        contractsSigned: kpi(contractsNow, contractsPrev),
        clientsAdded: kpi(clientsNow, clientsPrev),
        invoicesSent: kpi(invoicesNow, invoicesPrev),
      },
      leadTrend,
      upcoming: {
        events: upcomingEvents.map((e) => ({ ...e, attendees: e.attendees.map((a) => a.user) })),
        tasks: upcomingTasks.map((t) => ({ ...t, assignees: t.assignees.map((a) => a.user) })),
      },
      recentActivity,
    });
  })
);

// GET /api/dashboard/client/:clientId — a single client's overview. This
// includes invoice amounts and total spend, so SUPER_ADMIN + the owning
// CLIENT only — team members have their own money-free /workspace/dashboard.
router.get(
  "/client/:clientId",
  authorize(Role.SUPER_ADMIN, Role.CLIENT),
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    if (req.user!.role === Role.CLIENT && req.user!.clientId !== clientId) {
      return res.status(403).json({ message: "You can only access your own dashboard" });
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [activeServices, upcomingInvoice, totalSpend, recentPosts] =
      await Promise.all([
        prisma.clientService.findMany({
          where: { clientId, status: SubscriptionStatus.ACTIVE },
          include: { service: true },
        }),
        prisma.invoice.findFirst({
          where: { clientId, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT] } },
          orderBy: { dueDate: "asc" },
        }),
        prisma.payment.findMany({
          where: { invoice: { clientId }, status: "SUCCESS" },
          select: { amount: true },
        }),
        prisma.post.findMany({
          where: { clientService: { clientId } },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
      ]);

    // Per-service performance — real data from the new service-reporting models,
    // covering all 6 supported report types (not just SMM/Ads as before).
    const perService = await Promise.all(
      activeServices.map(async (cs) => {
        const category = cs.service.category;
        const reportType = reportTypeForCategory(category);
        const base = { clientServiceId: cs.id, serviceName: cs.service.name, category };
        if (!reportType) return base;
        const summary = await buildSummary(cs.id, reportType);
        return summary ? { ...base, ...summary } : base;
      })
    );

    // Reach trend: aggregate SMM report entries by calendar month (last 6 months)
    const smmIds = activeServices.filter((cs) => cs.service.category === "SMM").map((cs) => cs.id);
    const smmEntries = smmIds.length > 0
      ? await prisma.smmReportEntry.findMany({
          where: { clientServiceId: { in: smmIds }, postedAt: { gte: sixMonthsAgo } },
          select: { postedAt: true, profileReach: true },
        })
      : [];
    const reachByMonth: Record<string, number> = {};
    for (const entry of smmEntries) {
      const key = `${entry.postedAt.getFullYear()}-${String(entry.postedAt.getMonth() + 1).padStart(2, "0")}`;
      reachByMonth[key] = (reachByMonth[key] ?? 0) + (entry.profileReach ?? 0);
    }
    const reachTrend: { month: string; totalReach: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      reachTrend.push({ month: key, totalReach: reachByMonth[key] ?? 0 });
    }

    // Leads trend: group Paid-Ads-report-entry leads by calendar month (last 6 months)
    // — leads are now fetched from the Paid Ads reporting section, not the old Lead table.
    const adsIds = activeServices
      .filter((cs) => reportTypeForCategory(cs.service.category) === "paidAds")
      .map((cs) => cs.id);
    const paidAdsEntries = adsIds.length > 0
      ? await prisma.paidAdsReportEntry.findMany({
          where: { clientServiceId: { in: adsIds }, month: { gte: sixMonthsAgo } },
          select: { month: true, leads: true },
        })
      : [];

    // Marketing ROI — a spend-weighted average of each Paid Ads entry's
    // reported return (not a plain mean-of-percentages, which would let a
    // ₹500 test campaign skew the figure as much as a ₹5,00,000 one), over
    // every entry ever logged for this client's paid-ads services. Null
    // (never 0) when there's no paid-ads data to compute it from.
    const roiEntries = adsIds.length > 0
      ? await prisma.paidAdsReportEntry.findMany({
          where: { clientServiceId: { in: adsIds } },
          select: { spend: true, revenueGeneratedPct: true },
        })
      : [];
    let roiSpendWeight = 0;
    let roiWeightedSum = 0;
    let roiTotalSpend = 0;
    let roiSampleSize = 0;
    for (const entry of roiEntries) {
      const spend = Number(entry.spend);
      roiTotalSpend += spend;
      if (entry.revenueGeneratedPct == null || spend <= 0) continue;
      roiWeightedSum += spend * Number(entry.revenueGeneratedPct);
      roiSpendWeight += spend;
      roiSampleSize += 1;
    }
    const marketingRoi = roiSampleSize > 0
      ? { avgRoasPct: roiWeightedSum / roiSpendWeight, totalAdSpend: roiTotalSpend, sampleSize: roiSampleSize }
      : null;
    const leadsByMonth: Record<string, { count: number; revenueAttributed: number }> = {};
    for (const entry of paidAdsEntries) {
      const key = `${entry.month.getFullYear()}-${String(entry.month.getMonth() + 1).padStart(2, "0")}`;
      if (!leadsByMonth[key]) leadsByMonth[key] = { count: 0, revenueAttributed: 0 };
      leadsByMonth[key].count += entry.leads ?? 0;
    }
    const leadsTrend: { month: string; count: number; revenueAttributed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      leadsTrend.push({ month: key, ...(leadsByMonth[key] ?? { count: 0, revenueAttributed: 0 }) });
    }

    const totalSpendAmount = totalSpend.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalReach = recentPosts.reduce((sum, post) => sum + post.reach, 0);

    res.json({
      activeServices,
      upcomingInvoice,
      totalSpendAmount,
      recentPosts,
      totalReach,
      perService,
      reachTrend,
      leadsTrend,
      marketingRoi,
    });
  })
);

export default router;
