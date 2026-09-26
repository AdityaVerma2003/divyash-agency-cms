import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary";

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

// ── Public router ─────────────────────────────────────────────────────────────

export const publicCaseStudiesRouter = Router();

// GET /api/public/case-studies — unauthenticated, returns safe fields only
publicCaseStudiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const caseStudies = await prisma.caseStudy.findMany({
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      caseStudies.map((cs) => ({
        id: cs.id,
        clientId: cs.clientId,
        clientName: cs.client.companyName,
        title: cs.title,
        pdfUrl: cs.pdfUrl,
        createdAt: cs.createdAt,
      }))
    );
  })
);

// ── Admin router ──────────────────────────────────────────────────────────────

export const adminCaseStudiesRouter = Router();
adminCaseStudiesRouter.use(authenticate);
adminCaseStudiesRouter.use(authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER));

// GET /api/admin/case-studies
adminCaseStudiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const caseStudies = await prisma.caseStudy.findMany({
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(caseStudies);
  })
);

// POST /api/admin/case-studies — upload PDF for a client
adminCaseStudiesRouter.post(
  "/",
  pdfUpload.single("file"),
  asyncHandler(async (req, res) => {
    const { clientId, title } = z
      .object({
        clientId: z.string().uuid(),
        title: z.string().max(200).optional(),
      })
      .parse(req.body);

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw ApiError.notFound("Client not found");

    if (!req.file) throw ApiError.badRequest("No file uploaded");

    // Delete all existing case studies for this client before creating new one
    const existing = await prisma.caseStudy.findMany({ where: { clientId } });
    await Promise.all(existing.map((cs) => deleteFromCloudinary(cs.pdfUrl).catch(() => undefined)));
    await prisma.caseStudy.deleteMany({ where: { clientId } });

    const pdfUrl = await uploadToCloudinary(req.file.buffer, {
      folder:        "divyash-case-studies",
      public_id:     `case-study-${clientId}`,
      resource_type: "raw",
    });

    const caseStudy = await prisma.caseStudy.create({
      data: { clientId, title: title ?? null, pdfUrl },
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.status(201).json(caseStudy);
  })
);

// DELETE /api/admin/case-studies/:id
adminCaseStudiesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const cs = await prisma.caseStudy.findUnique({ where: { id: req.params.id } });
    if (!cs) throw ApiError.notFound("Case study not found");

    await deleteFromCloudinary(cs.pdfUrl).catch(() => undefined);
    await prisma.caseStudy.delete({ where: { id: req.params.id } });

    res.status(204).send();
  })
);
