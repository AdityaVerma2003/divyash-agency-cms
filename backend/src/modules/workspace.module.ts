import { Router } from "express";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize, scopeToAssignedClient } from "../middleware/auth.middleware";
import { assignedClientsLite, clientLiteById } from "../lib/clientLite";
import {
  REPORT_TYPES,
  reportTypeForCategory,
  reportTypeFromEnum,
  reportTypeToEnum,
  hasEntryForMonth,
  type ReportType,
} from "../lib/reportTypes";

/**
 * Team-member workspace. Every response here is built from ClientLite
 * projections and report tables only — no revenue, invoice, rate or contract
 * field is ever selected, so money cannot leak even by accident.
 */

const router = Router();
router.use(authenticate);
// SUPER_ADMIN is allowed through so an admin can inspect what their team sees.
router.use(authorize(Role.ACCOUNT_MANAGER, Role.SUPER_ADMIN));

function monthStartUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function callerReportTypes(userId: string, role: Role): Promise<ReportType[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reportTypes: true } });
  const assigned = (user?.reportTypes ?? []).map(reportTypeFromEnum);
  // A super admin inspecting the workspace sees every template
  if (assigned.length === 0 && role === Role.SUPER_ADMIN) return REPORT_TYPES;
  return assigned;
}

/** Counts the caller's own entries per month, across every type. */
async function myEntryVolume(userId: string, since: Date) {
  const where = { createdById: userId, createdAt: { gte: since } };
  const select = { createdAt: true as const };
  const [smm, seo, paidAds, design, content, webDev] = await Promise.all([
    prisma.smmReportEntry.findMany({ where, select }),
    prisma.seoReportEntry.findMany({ where, select }),
    prisma.paidAdsReportEntry.findMany({ where, select }),
    prisma.graphicDesignReportEntry.findMany({ where, select }),
    prisma.contentCreationReportEntry.findMany({ where, select }),
    prisma.websiteDevelopmentReportEntry.findMany({ where, select }),
  ]);
  const counts: Record<string, number> = {};
  for (const row of [...smm, ...seo, ...paidAds, ...design, ...content, ...webDev]) {
    const key = monthKey(row.createdAt);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** The caller's most recent entries across all types, newest first. */
async function myRecentEntries(userId: string, take: number) {
  const where = { createdById: userId };
  const common = { orderBy: { createdAt: "desc" as const }, take };

  const [smm, seo, paidAds, design, content, webDev] = await Promise.all([
    prisma.smmReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, postedAt: true } }),
    prisma.seoReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, entryDate: true } }),
    prisma.paidAdsReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, month: true, campaignName: true } }),
    prisma.graphicDesignReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, executionDate: true, designType: true } }),
    prisma.contentCreationReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, executionDate: true, contentType: true } }),
    prisma.websiteDevelopmentReportEntry.findMany({ where, ...common, select: { id: true, clientId: true, createdAt: true, websiteType: true } }),
  ]);

  const rows = [
    ...smm.map((r) => ({ id: r.id, type: "smm" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.postedAt, label: "Social post" })),
    ...seo.map((r) => ({ id: r.id, type: "seo" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.entryDate, label: "SEO activity" })),
    ...paidAds.map((r) => ({ id: r.id, type: "paidAds" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.month, label: r.campaignName })),
    ...design.map((r) => ({ id: r.id, type: "graphicDesigning" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.executionDate, label: r.designType })),
    ...content.map((r) => ({ id: r.id, type: "contentCreation" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.executionDate, label: r.contentType })),
    ...webDev.map((r) => ({ id: r.id, type: "websiteDevelopment" as ReportType, clientId: r.clientId, createdAt: r.createdAt, entryDate: r.createdAt, label: r.websiteType })),
  ];

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows.slice(0, take);
}


// GET /api/workspace/dashboard
router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const { userId, role } = req.user!;
    const myTypes = await callerReportTypes(userId, role);

    const now = new Date();
    const thisMonth = monthStartUTC(now);
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const clients = await assignedClientsLite(userId);

    // Which of my report types are still missing an entry this month, per client
    const assignedClientIds = clients.map((c) => c.id);
    const services = assignedClientIds.length
      ? await prisma.clientService.findMany({
          where: { clientId: { in: assignedClientIds }, status: "ACTIVE" },
          select: { id: true, clientId: true, service: { select: { name: true, category: true } } },
        })
      : [];

    const reportsDue = (
      await Promise.all(
        services.map(async (svc) => {
          const type = reportTypeForCategory(svc.service.category);
          if (!type || !myTypes.includes(type)) return null;
          const done = await hasEntryForMonth(type, svc.id, thisMonth, nextMonth);
          return {
            clientId: svc.clientId,
            clientName: clients.find((c) => c.id === svc.clientId)?.companyName ?? "",
            clientServiceId: svc.id,
            serviceName: svc.service.name,
            reportType: type,
            hasEntryThisMonth: done,
          };
        })
      )
    ).filter((row): row is NonNullable<typeof row> => row !== null);

    const [entryVolume, recentEntries, openTasks, upcomingEvents] = await Promise.all([
      myEntryVolume(userId, sixMonthsAgo),
      myRecentEntries(userId, 8),
      prisma.task.findMany({
        where: {
          status: { not: TaskStatus.COMPLETE },
          OR: [{ assignees: { some: { userId } } }, { createdById: userId }],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true,
          client: { select: { id: true, companyName: true } },
        },
      }),
      prisma.calendarEvent.findMany({
        where: {
          endAt: { gte: now },
          OR: [{ createdById: userId }, { attendees: { some: { userId } } }],
        },
        orderBy: { startAt: "asc" },
        take: 5,
        select: { id: true, title: true, startAt: true, endAt: true, mode: true, location: true, meetingUrl: true },
      }),
    ]);

    const entriesThisMonth = entryVolume[monthKey(now)] ?? 0;

    // Zero-fill the 6-month series so the chart has a stable x-axis
    const volumeSeries: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = monthKey(d);
      volumeSeries.push({ month: key, count: entryVolume[key] ?? 0 });
    }

    res.json({
      reportTypes: myTypes,
      kpis: {
        assignedClients: clients.length,
        entriesThisMonth,
        reportsDue: reportsDue.filter((r) => !r.hasEntryThisMonth).length,
        openTasks: openTasks.length,
      },
      clients,
      reportsDue,
      entryVolume: volumeSeries,
      recentEntries,
      myTasks: openTasks,
      upcomingEvents,
    });
  })
);

// GET /api/workspace/clients
router.get(
  "/clients",
  asyncHandler(async (req, res) => {
    res.json(await assignedClientsLite(req.user!.userId));
  })
);

// GET /api/workspace/clients/:clientId — the client's workspace
router.get(
  "/clients/:clientId",
  scopeToAssignedClient,
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const client = await clientLiteById(clientId);
    if (!client) throw ApiError.notFound("Client not found");

    const myTypes = await callerReportTypes(req.user!.userId, req.user!.role);

    // Only services whose report type is mine — other disciplines stay hidden
    const services = (
      await prisma.clientService.findMany({
        where: { clientId, status: "ACTIVE" },
        select: { id: true, service: { select: { name: true, category: true } } },
      })
    )
      .map((svc) => ({
        clientServiceId: svc.id,
        serviceName: svc.service.name,
        category: svc.service.category,
        reportType: reportTypeForCategory(svc.service.category),
      }))
      .filter((svc) => svc.reportType && myTypes.includes(svc.reportType));

    // Read-only teammate names, per the spec — no contact details
    const teammates = await prisma.clientAssignment.findMany({
      where: { clientId },
      select: { user: { select: { id: true, name: true, designation: true } } },
    });

    res.json({
      client,
      services,
      teammates: teammates.map((t) => t.user),
    });
  })
);

// GET /api/workspace/my-reports?month=YYYY-MM — the caller's own entries
router.get(
  "/my-reports",
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const monthParam = req.query.month as string | undefined;

    let from: Date | undefined;
    let to: Date | undefined;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      from = new Date(Date.UTC(y, m - 1, 1));
      to = new Date(Date.UTC(y, m, 1));
    }

    const rows = await myRecentEntries(userId, 200);
    const filtered = from && to
      ? rows.filter((r) => r.entryDate >= from! && r.entryDate < to!)
      : rows;

    const clients = await assignedClientsLite(userId);
    const nameById = new Map(clients.map((c) => [c.id, c.companyName]));

    res.json(
      filtered.map((r) => ({ ...r, clientName: nameById.get(r.clientId) ?? "—" }))
    );
  })
);

export default router;
