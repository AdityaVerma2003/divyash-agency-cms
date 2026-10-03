import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import {
  authenticate,
  authorize,
  scopeToAssignedClient,
  requireReportType,
} from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { assertMonthEditable } from "../lib/monthLock";
import { isAssignedToClient } from "../lib/clientLite";
import { encryptSecret, decryptSecret, encryptionAvailable } from "../lib/crypto";
import {
  ReportType,
  REPORT_TYPES,
  reportTypeForCategory,
  summarizeSmm,
  summarizeSeo,
  summarizePaidAds,
  summarizeItemLog,
  summarizeWebsiteDevelopment,
} from "../lib/reportTypes";

// ── Zod schemas, one per report type ──────────────────────────────────────

const smmSchema = z.object({
  type: z.literal("smm"),
  clientServiceId: z.string().uuid(),
  postType: z.enum(["STATIC", "CAROUSEL", "REEL"]),
  platform: z.enum(["META", "YOUTUBE", "WHATSAPP", "LINKEDIN", "X", "OTHER"]),
  platformOther: z.string().max(60).optional(),
  postUrl: z.string().url().optional().or(z.literal("")),
  postedAt: z.coerce.date(),
  marketingType: z.enum(["ORGANIC", "PAID"]),
  followersGain: z.number().int().optional(),
  profileReach: z.number().int().optional(),
  postLikes: z.number().int().optional(),
  profileVisits: z.number().int().optional(),
  isPaidAd: z.boolean().default(false),
  paidAdSpend: z.number().min(0).optional(),
  paidFollowersGain: z.number().int().optional(),
  paidLikes: z.number().int().optional(),
  paidImpressions: z.number().int().optional(),
  paidLeadsGenerated: z.number().int().optional(),
});

const seoSchema = z.object({
  type: z.literal("seo"),
  clientServiceId: z.string().uuid(),
  entryDate: z.coerce.date(),
  backlinksCreated: z.number().int().min(0).default(0),
  directorySubmissions: z.number().int().min(0).default(0),
  articleSubmissions: z.number().int().min(0).default(0),
  imageSubmissions: z.number().int().min(0).default(0),
  profileCreations: z.number().int().min(0).default(0),
  approvedLinks: z.number().int().min(0).default(0),
  keywordRanking: z.string().max(500).optional(),
  serpRanking: z.string().max(200).optional(),
  trafficGain: z.number().int().min(0).default(0),
  countryTraffic: z.array(z.object({ country: z.string(), visits: z.number().int().min(0) })).optional(),
});

const paidAdsSchema = z.object({
  type: z.literal("paidAds"),
  clientServiceId: z.string().uuid(),
  campaignName: z.string().min(1).max(200),
  adGroup: z.string().max(200).optional(),
  adSet: z.string().max(200).optional(),
  objective: z.enum(["LEAD_GEN", "AWARENESS", "SALES", "TRAFFIC", "PROMOTION"]),
  setupDate: z.coerce.date(),
  dailyBudget: z.number().min(0),
  month: z.coerce.date(),
  spend: z.number().min(0).default(0),
  reach: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  conversions: z.number().int().min(0).optional(),
  leads: z.number().int().min(0).optional(),
  leadsConverted: z.number().int().min(0).optional(),
  profileVisits: z.number().int().min(0).optional(),
  addToCart: z.number().int().min(0).optional(),
  revenueGeneratedPct: z.number().optional(),
  cpl: z.number().min(0).optional(),
  cpc: z.number().min(0).optional(),
  cpv: z.number().min(0).optional(),
  targetedCountries: z.array(z.string()).optional(),
});

const graphicDesigningSchema = z.object({
  type: z.literal("graphicDesigning"),
  clientServiceId: z.string().uuid(),
  designType: z.enum([
    "VIDEO_EDITING", "BRANDING", "SOCIAL_MEDIA_POST", "AUDIO_BOOSTING",
    "LONG_VIDEO_EDITING", "THREE_D_ANIMATION", "LOGO_DESIGN", "OTHER",
  ]),
  designTypeOther: z.string().max(100).optional(),
  itemCount: z.number().int().min(1).default(1),
  executionDate: z.coerce.date(),
  submissionDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

const contentCreationSchema = z.object({
  type: z.literal("contentCreation"),
  clientServiceId: z.string().uuid(),
  contentType: z.enum(["CONTENT_SHOOT", "COPYWRITING", "SCRIPT_WRITING", "OTHER"]),
  contentTypeOther: z.string().max(100).optional(),
  executionDate: z.coerce.date(),
  submissionDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

const websiteDevelopmentSchema = z.object({
  type: z.literal("websiteDevelopment"),
  clientServiceId: z.string().uuid(),
  websiteType: z.enum(["INFOGRAPHIC", "BRAND", "ECOMMERCE", "CUSTOM_CODED", "LANDING_PAGE_ONLY", "OTHER"]),
  websiteTypeOther: z.string().max(100).optional(),
  pageCount: z.number().int().min(0).optional(),
  platformLanguage: z.string().max(100).optional(),
  adminCredentialNote: z.string().max(500).optional(),
  seoEnhanced: z.boolean().default(false),
  domainPlatform: z.string().max(100).optional(),
  hosting: z.enum(["DD_SHARED", "CLIENT_OWN"]).optional(),
  websiteLink: z.string().url().optional().or(z.literal("")),
  maintenanceAgreed: z.boolean().default(false),
  executionDate: z.coerce.date().optional(),
  submissionDate: z.coerce.date().optional(),
});

const entrySchema = z.discriminatedUnion("type", [
  smmSchema, seoSchema, paidAdsSchema, graphicDesigningSchema, contentCreationSchema, websiteDevelopmentSchema,
]);

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadClientServiceWithType(clientServiceId: string) {
  const cs = await prisma.clientService.findUnique({
    where: { id: clientServiceId },
    include: { service: true },
  });
  if (!cs) throw ApiError.notFound("Client service not found");
  const reportType = reportTypeForCategory(cs.service.category);
  if (!reportType) {
    throw ApiError.badRequest(`No reporting template exists yet for the "${cs.service.category}" service category`);
  }
  return { cs, reportType };
}

function assertClientScoped(req: any, clientId: string) {
  if (req.user!.role === Role.CLIENT && req.user!.clientId !== clientId) {
    throw ApiError.forbidden("Access denied");
  }
}

type EntryInput = z.infer<typeof entrySchema>;

/** Which date field decides the reporting month, per type. */
function entryMonthDate(data: EntryInput): Date {
  switch (data.type) {
    case "smm": return data.postedAt;
    case "seo": return data.entryDate;
    case "paidAds": return data.month;
    case "graphicDesigning": return data.executionDate;
    case "contentCreation": return data.executionDate;
    case "websiteDevelopment": return data.executionDate ?? new Date();
    default: return new Date();
  }
}

/** Website Development keeps one record per service; everything else appends. */
const WEB_DEV_IS_SINGLETON = true;

/** Ciphertext and internal notes must never reach a browser. */
const WEB_DEV_SAFE_SELECT = {
  id: true, clientServiceId: true, clientId: true, createdById: true,
  websiteType: true, websiteTypeOther: true, pageCount: true, platformLanguage: true,
  seoEnhanced: true, domainPlatform: true, hosting: true, websiteLink: true,
  maintenanceAgreed: true, executionDate: true, submissionDate: true, notes: true,
  createdAt: true, updatedAt: true,
  // adminCredentialEnc deliberately omitted — see the reveal endpoint
} as const;

async function findEntryById(type: ReportType, id: string) {
  switch (type) {
    case "smm": return prisma.smmReportEntry.findUnique({ where: { id } });
    case "seo": return prisma.seoReportEntry.findUnique({ where: { id } });
    case "paidAds": return prisma.paidAdsReportEntry.findUnique({ where: { id } });
    case "graphicDesigning": return prisma.graphicDesignReportEntry.findUnique({ where: { id } });
    case "contentCreation": return prisma.contentCreationReportEntry.findUnique({ where: { id } });
    case "websiteDevelopment": return prisma.websiteDevelopmentReportEntry.findUnique({ where: { id }, select: WEB_DEV_SAFE_SELECT });
  }
}

async function deleteEntryById(type: ReportType, id: string) {
  switch (type) {
    case "smm": await prisma.smmReportEntry.delete({ where: { id } }); return;
    case "seo": await prisma.seoReportEntry.delete({ where: { id } }); return;
    case "paidAds": await prisma.paidAdsReportEntry.delete({ where: { id } }); return;
    case "graphicDesigning": await prisma.graphicDesignReportEntry.delete({ where: { id } }); return;
    case "contentCreation": await prisma.contentCreationReportEntry.delete({ where: { id } }); return;
    case "websiteDevelopment": await prisma.websiteDevelopmentReportEntry.delete({ where: { id } }); return;
  }
}

/**
 * Derives the report type for a request from whichever identifier it carries:
 * the service being reported on, or an explicit `type` (used by DELETE).
 * Feeds requireReportType, so a specialist can't touch another discipline.
 */
async function reportTypeForRequest(req: {
  query: Record<string, unknown>;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}): Promise<ReportType | null> {
  const clientServiceId =
    (req.query.clientServiceId as string | undefined) ??
    (req.body?.clientServiceId as string | undefined);

  if (clientServiceId) {
    const cs = await prisma.clientService.findUnique({
      where: { id: clientServiceId },
      include: { service: true },
    });
    if (!cs) return null;
    return reportTypeForCategory(cs.service.category);
  }

  const explicit = (req.query.type as ReportType | undefined) ?? (req.body?.type as ReportType | undefined);
  return explicit ?? null;
}

/** The month that an already-stored entry belongs to. */
function storedEntryMonth(type: ReportType, entry: any): Date {
  switch (type) {
    case "smm": return entry.postedAt;
    case "seo": return entry.entryDate;
    case "paidAds": return entry.month;
    case "graphicDesigning":
    case "contentCreation": return entry.executionDate;
    case "websiteDevelopment": return entry.executionDate ?? entry.createdAt;
  }
}

// ── Admin / team router ──────────────────────────────────────────────────
// Both staff roles reach this, but every mutating route is additionally
// gated by scopeToAssignedClient + requireReportType, so a team member can
// only file their own report types for clients they're assigned to.

export const adminServiceReportsRouter = Router();
adminServiceReportsRouter.use(authenticate);
adminServiceReportsRouter.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

// GET /api/admin/service-reports?clientServiceId=...
adminServiceReportsRouter.get(
  "/",
  scopeToAssignedClient,
  requireReportType(reportTypeForRequest),
  asyncHandler(async (req, res) => {
    const clientServiceId = req.query.clientServiceId as string | undefined;
    if (!clientServiceId) throw ApiError.badRequest("clientServiceId query param is required");
    const { reportType } = await loadClientServiceWithType(clientServiceId);

    let entries: unknown[];
    switch (reportType) {
      case "smm":
        entries = await prisma.smmReportEntry.findMany({ where: { clientServiceId }, orderBy: { postedAt: "desc" } });
        break;
      case "seo":
        entries = await prisma.seoReportEntry.findMany({ where: { clientServiceId }, orderBy: { entryDate: "desc" } });
        break;
      case "paidAds":
        entries = await prisma.paidAdsReportEntry.findMany({ where: { clientServiceId }, orderBy: { month: "desc" } });
        break;
      case "graphicDesigning":
        entries = await prisma.graphicDesignReportEntry.findMany({ where: { clientServiceId }, orderBy: { executionDate: "desc" } });
        break;
      case "contentCreation":
        entries = await prisma.contentCreationReportEntry.findMany({ where: { clientServiceId }, orderBy: { executionDate: "desc" } });
        break;
      case "websiteDevelopment":
        entries = await prisma.websiteDevelopmentReportEntry.findMany({ where: { clientServiceId }, orderBy: { createdAt: "desc" } });
        break;
    }

    res.json({ reportType, entries });
  })
);

// POST /api/admin/service-reports
adminServiceReportsRouter.post(
  "/",
  scopeToAssignedClient,
  requireReportType(reportTypeForRequest),
  asyncHandler(async (req, res) => {
    const data = entrySchema.parse(req.body);
    const { cs, reportType } = await loadClientServiceWithType(data.clientServiceId);
    if (reportType !== data.type) {
      throw ApiError.badRequest(`This service is a "${reportType}" service, not "${data.type}"`);
    }

    const user = req.user!;
    await assertMonthEditable(entryMonthDate(data), cs.clientId, user);

    // Provenance stamped server-side; never accepted from the client
    const provenance = { clientId: cs.clientId, createdById: user.userId };

    let created: unknown;
    switch (data.type) {
      case "smm": {
        const { type, clientServiceId, postUrl, ...rest } = data;
        created = await prisma.smmReportEntry.create({
          data: { clientServiceId, postUrl: postUrl || null, ...rest, ...provenance },
        });
        break;
      }
      case "seo": {
        const { type, clientServiceId, ...rest } = data;
        created = await prisma.seoReportEntry.create({ data: { clientServiceId, ...rest, ...provenance } });
        break;
      }
      case "paidAds": {
        const { type, clientServiceId, ...rest } = data;
        created = await prisma.paidAdsReportEntry.create({ data: { clientServiceId, ...rest, ...provenance } });
        break;
      }
      case "graphicDesigning": {
        const { type, clientServiceId, ...rest } = data;
        created = await prisma.graphicDesignReportEntry.create({ data: { clientServiceId, ...rest, ...provenance } });
        break;
      }
      case "contentCreation": {
        const { type, clientServiceId, ...rest } = data;
        created = await prisma.contentCreationReportEntry.create({ data: { clientServiceId, ...rest, ...provenance } });
        break;
      }
      case "websiteDevelopment": {
        const { type, clientServiceId, websiteLink, adminCredentialNote, ...rest } = data;
        if (adminCredentialNote && !encryptionAvailable()) {
          throw new ApiError(503, "Credential storage is unavailable — CREDENTIALS_ENCRYPTION_KEY is not configured");
        }
        const payload = {
          clientServiceId,
          websiteLink: websiteLink || null,
          ...rest,
          ...provenance,
          adminCredentialEnc: adminCredentialNote ? encryptSecret(adminCredentialNote) : undefined,
        };
        // One record per service — editing the project rather than appending
        const existing = WEB_DEV_IS_SINGLETON
          ? await prisma.websiteDevelopmentReportEntry.findFirst({
              where: { clientServiceId },
              select: { id: true },
            })
          : null;
        created = existing
          ? await prisma.websiteDevelopmentReportEntry.update({
              where: { id: existing.id },
              data: payload,
              select: WEB_DEV_SAFE_SELECT,
            })
          : await prisma.websiteDevelopmentReportEntry.create({
              data: payload,
              select: WEB_DEV_SAFE_SELECT,
            });
        break;
      }
    }

    logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: `ReportEntry:${data.type}`,
      entityId: (created as { id: string }).id,
      meta: { clientId: cs.clientId, clientServiceId: data.clientServiceId },
    }).catch(() => undefined);

    res.status(201).json(created);
  })
);

// DELETE /api/admin/service-reports/:id?type=...
adminServiceReportsRouter.delete(
  "/:id",
  requireReportType((req) => (req.query.type as ReportType | undefined) ?? null),
  asyncHandler(async (req, res) => {
    const type = req.query.type as ReportType | undefined;
    if (!type || !REPORT_TYPES.includes(type)) throw ApiError.badRequest("A valid type query param is required");

    const entry = await findEntryById(type, req.params.id);
    if (!entry) throw ApiError.notFound("Report entry not found");

    const user = req.user!;
    if (user.role !== Role.SUPER_ADMIN) {
      // Team members may only remove entries for clients they're assigned to,
      // and only ones they created themselves.
      if (!(await isAssignedToClient(user.userId, entry.clientId))) {
        throw ApiError.forbidden("You are not assigned to this client");
      }
      if (entry.createdById && entry.createdById !== user.userId) {
        throw ApiError.forbidden("You can only delete entries you created");
      }
    }
    await assertMonthEditable(storedEntryMonth(type, entry), entry.clientId, user);

    await deleteEntryById(type, req.params.id);

    logAudit({
      userId: user.userId,
      action: "DELETE",
      entity: `ReportEntry:${type}`,
      entityId: req.params.id,
      meta: { clientId: entry.clientId },
    }).catch(() => undefined);

    res.status(204).send();
  })
);

/**
 * POST /api/admin/service-reports/:id/reveal-credentials
 * Decrypts a client website's stored admin credentials. SUPER_ADMIN, or the
 * assigned WEB_DEV member for that client. Every reveal is audit-logged.
 */
adminServiceReportsRouter.post(
  "/:id/reveal-credentials",
  asyncHandler(async (req, res) => {
    const entry = await prisma.websiteDevelopmentReportEntry.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true, adminCredentialEnc: true },
    });
    if (!entry) throw ApiError.notFound("Website record not found");

    const user = req.user!;
    if (user.role !== Role.SUPER_ADMIN) {
      const member = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { reportTypes: true },
      });
      const isWebDev = (member?.reportTypes ?? []).includes("WEB_DEV");
      if (!isWebDev || !(await isAssignedToClient(user.userId, entry.clientId))) {
        throw ApiError.forbidden("You don't have access to these credentials");
      }
    }

    if (!entry.adminCredentialEnc) {
      res.json({ credentials: null });
      return;
    }
    if (!encryptionAvailable()) {
      throw new ApiError(503, "Credential storage is unavailable — CREDENTIALS_ENCRYPTION_KEY is not configured");
    }

    logAudit({
      userId: user.userId,
      action: "REVEAL_CREDENTIALS",
      entity: "WebsiteDevelopmentReportEntry",
      entityId: entry.id,
      meta: { clientId: entry.clientId },
    }).catch(() => undefined);

    res.json({ credentials: decryptSecret(entry.adminCredentialEnc) });
  })
);

// ── Portal (client-facing) router — aggregated summaries only ────────────

export const portalServiceReportsRouter = Router();
portalServiceReportsRouter.use(authenticate);

// GET /api/portal/service-reports/summary?clientServiceId=...
portalServiceReportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const clientServiceId = req.query.clientServiceId as string | undefined;
    if (!clientServiceId) throw ApiError.badRequest("clientServiceId query param is required");
    const { cs, reportType } = await loadClientServiceWithType(clientServiceId);
    assertClientScoped(req, cs.clientId);

    const summary = await buildSummary(clientServiceId, reportType);
    res.json({ reportType, serviceName: cs.service.name, summary });
  })
);

// GET /api/portal/service-reports/entries?clientServiceId=... — the full,
// detailed entry log for one service (what the client sees when they click
// through from a dashboard graph). adminCredentialNote is never selected here.
portalServiceReportsRouter.get(
  "/entries",
  asyncHandler(async (req, res) => {
    const clientServiceId = req.query.clientServiceId as string | undefined;
    if (!clientServiceId) throw ApiError.badRequest("clientServiceId query param is required");
    const { cs, reportType } = await loadClientServiceWithType(clientServiceId);
    assertClientScoped(req, cs.clientId);

    let entries: unknown[];
    switch (reportType) {
      case "smm":
        entries = await prisma.smmReportEntry.findMany({ where: { clientServiceId }, orderBy: { postedAt: "desc" } });
        break;
      case "seo":
        entries = await prisma.seoReportEntry.findMany({ where: { clientServiceId }, orderBy: { entryDate: "desc" } });
        break;
      case "paidAds":
        entries = await prisma.paidAdsReportEntry.findMany({ where: { clientServiceId }, orderBy: { month: "desc" } });
        break;
      case "graphicDesigning":
        entries = await prisma.graphicDesignReportEntry.findMany({ where: { clientServiceId }, orderBy: { executionDate: "desc" } });
        break;
      case "contentCreation":
        entries = await prisma.contentCreationReportEntry.findMany({ where: { clientServiceId }, orderBy: { executionDate: "desc" } });
        break;
      case "websiteDevelopment":
        entries = await prisma.websiteDevelopmentReportEntry.findMany({
          where: { clientServiceId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, clientServiceId: true, websiteType: true, websiteTypeOther: true,
            pageCount: true, platformLanguage: true, seoEnhanced: true, domainPlatform: true,
            hosting: true, websiteLink: true, maintenanceAgreed: true, executionDate: true,
            submissionDate: true, createdAt: true,
            // adminCredentialNote deliberately omitted — internal only
          },
        });
        break;
    }

    res.json({ reportType, serviceName: cs.service.name, entries });
  })
);

export async function buildSummary(clientServiceId: string, reportType: ReportType) {
  switch (reportType) {
    case "smm": {
      const entries = await prisma.smmReportEntry.findMany({ where: { clientServiceId } });
      return entries.length > 0 ? summarizeSmm(entries) : null;
    }
    case "seo": {
      const entries = await prisma.seoReportEntry.findMany({ where: { clientServiceId } });
      return entries.length > 0 ? summarizeSeo(entries) : null;
    }
    case "paidAds": {
      const entries = await prisma.paidAdsReportEntry.findMany({ where: { clientServiceId } });
      return entries.length > 0 ? summarizePaidAds(entries) : null;
    }
    case "graphicDesigning": {
      const entries = await prisma.graphicDesignReportEntry.findMany({ where: { clientServiceId } });
      return entries.length > 0 ? summarizeItemLog(entries) : null;
    }
    case "contentCreation": {
      const entries = await prisma.contentCreationReportEntry.findMany({ where: { clientServiceId } });
      return entries.length > 0 ? summarizeItemLog(entries) : null;
    }
    case "websiteDevelopment": {
      const entries = await prisma.websiteDevelopmentReportEntry.findMany({ where: { clientServiceId } });
      return summarizeWebsiteDevelopment(entries);
    }
  }
}
