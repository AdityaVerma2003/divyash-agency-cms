import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize, scopeToOwnClient } from "../middleware/auth.middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary";

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

const reportInputSchema = z.object({
  weekStartDate: z.coerce.date(),
  smmTotalPosts: z.number().int().nonnegative().optional(),
  smmReach: z.number().int().nonnegative().optional(),
  smmTraffic: z.number().int().nonnegative().optional(),
  seoBacklinks: z.number().int().nonnegative().optional(),
  seoTrafficGrowth: z.number().optional(),
  seoKeywordRanks: z.string().optional(),
  seoBlogsCount: z.number().int().nonnegative().optional(),
  seoErrors: z.string().optional(),
  localSeoReviewsGained: z.number().int().nonnegative().optional(),
  localSeoPosts: z.number().int().nonnegative().optional(),
  localSeoTotalClicks: z.number().int().nonnegative().optional(),
  localSeoCallsReceived: z.number().int().nonnegative().optional(),
  localSeoProfileInteractions: z.number().int().nonnegative().optional(),
  localSeoBookings: z.number().int().nonnegative().optional(),
});

// ── Admin router (/api/admin/clients/:clientId/reports) ───────────────────────

export const adminReportsRouter = Router({ mergeParams: true });
adminReportsRouter.use(authenticate);
adminReportsRouter.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

// GET /api/admin/clients/:clientId/reports
adminReportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const reports = await prisma.clientReport.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { weekStartDate: "desc" },
    });
    res.json(reports);
  })
);

// POST /api/admin/clients/:clientId/reports — upsert for a given week
adminReportsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = reportInputSchema.parse(req.body);
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw ApiError.notFound("Client not found");

    const report = await prisma.clientReport.upsert({
      where: { clientId_weekStartDate: { clientId, weekStartDate: data.weekStartDate } },
      create: { clientId, ...data },
      update: { ...data },
    });

    res.status(201).json(report);
  })
);

// POST /api/admin/clients/:clientId/reports/:reportId/paid-ads-file
adminReportsRouter.post(
  "/:reportId/paid-ads-file",
  pdfUpload.single("file"),
  asyncHandler(async (req, res) => {
    const { clientId, reportId } = req.params;

    const report = await prisma.clientReport.findUnique({ where: { id: reportId } });
    if (!report || report.clientId !== clientId) throw ApiError.notFound("Report not found");
    if (!req.file) throw ApiError.badRequest("No file uploaded");

    const [paidAdsReportUrl] = await Promise.all([
      uploadToCloudinary(req.file.buffer, {
        folder:        "divyash-client-reports",
        public_id:     `report-ads-${reportId}`,
        resource_type: "raw",
      }),
      report.paidAdsReportUrl ? deleteFromCloudinary(report.paidAdsReportUrl) : Promise.resolve(),
    ]);

    await prisma.clientReport.update({
      where: { id: reportId },
      data: { paidAdsReportUrl },
    });

    res.json({ paidAdsReportUrl });
  })
);

// ── Client portal router (/api/portal/reports) ────────────────────────────────

export const portalReportsRouter = Router();
portalReportsRouter.use(authenticate);

// GET /api/portal/reports — CLIENT only; scoped to their own clientId from session
portalReportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.CLIENT) throw ApiError.forbidden("Access denied");
    const clientId = req.user!.clientId;
    if (!clientId) throw ApiError.forbidden("No client associated with this account");

    const reports = await prisma.clientReport.findMany({
      where: { clientId },
      orderBy: { weekStartDate: "desc" },
    });
    res.json(reports);
  })
);
