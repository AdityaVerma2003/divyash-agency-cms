import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { OnboardingStatus, ReportType as ReportTypeEnum, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendEmail } from "../lib/email";
import { logAudit } from "../lib/audit";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary";
import { defaultReportTypesForDesignation } from "../lib/reportTypes";

const router = Router();

// ── Photo upload (multer memory storage) ─────────────────────────────────────
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Public team endpoint (unauthenticated) ────────────────────────────────────

// GET /api/users/public/team — public, unauthenticated
// Returns safe fields for COMPLETE employees only (no email/mobile/bankDetails)
router.get(
  "/public/team",
  asyncHandler(async (_req, res) => {
    const members = await prisma.user.findMany({
      where: {
        role: { not: Role.CLIENT },
        onboardingStatus: OnboardingStatus.COMPLETE,
      },
      select: {
        id: true,
        name: true,
        designation: true,
        photoUrl: true,
        socialLinks: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    res.json(members);
  })
);

// ── All routes below require authentication ───────────────────────────────────
router.use(authenticate);

// GET /api/users — list all non-client team members (admin only)
router.get(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    const users = await prisma.user.findMany({
      where: { role: { not: Role.CLIENT } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        onboardingStatus: true,
        photoUrl: true,
        mobile: true,
        designation: true,
        reportTypes: true,
        createdAt: true,
        // Only Super Admins can see bank details, per-row (see users.module.ts PATCH handler's
        // matching isSelf/isSuperAdmin write guard) — Account Managers never get this field at all.
        ...(isSuperAdmin ? { bankDetails: true } : {}),
        clientAssignments: { select: { client: { select: { id: true, companyName: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(
      users.map(({ clientAssignments, ...u }) => ({
        ...u,
        managedClients: clientAssignments.map((a) => a.client),
      }))
    );
  })
);

// POST /api/users — invite a new team member (SUPER_ADMIN only)
router.post(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { name, email, role, designation, clientIds, reportTypes } = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum([Role.ACCOUNT_MANAGER, Role.SUPER_ADMIN]),
        designation: z.string().min(1).max(60).optional(),
        // Clients this teammate will work on — mandatory, at least one
        clientIds: z.array(z.string().uuid()).min(1, "Assign at least one client"),
        // Which report types they may file. Omitted ⇒ defaulted from designation.
        reportTypes: z.array(z.nativeEnum(ReportTypeEnum)).optional(),
      })
      .parse(req.body);

    const resolvedReportTypes = reportTypes ?? defaultReportTypesForDesignation(designation);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict("A user with this email already exists");

    const foundCount = await prisma.client.count({ where: { id: { in: clientIds } } });
    if (foundCount !== clientIds.length) throw ApiError.badRequest("One or more selected clients were not found");

    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const [tokenHash] = await Promise.all([bcrypt.hash(rawToken, 10)]);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: randomPasswordHash,
          role,
          designation,
          reportTypes: resolvedReportTypes,
          onboardingStatus: OnboardingStatus.INVITED,
        },
        select: { id: true, name: true, email: true, role: true, designation: true, reportTypes: true, onboardingStatus: true, createdAt: true },
      });
      await tx.user.update({
        where: { id: created.id },
        data: { resetToken: tokenHash, resetTokenExpiresAt: expiresAt },
      });
      // Additive — creates a join row per selected client without touching
      // any existing assignments those clients already have to other teammates.
      await tx.clientAssignment.createMany({
        data: clientIds.map((clientId) => ({ clientId, userId: created.id })),
        skipDuplicates: true,
      });
      return created;
    });

    res.status(201).json({ ...user, emailQueued: true });

    const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
    const setupUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    // Always log the setup URL so it can be used for testing when email delivery is unavailable
    console.log(`\n[invite] Setup link for ${email}:\n  ${setupUrl}\n`);

    sendEmail(
      email,
      "You've been invited to Divyash Digital",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <img src="${origin}/divyash-logo-everywhere.png" alt="Divyash Digital" style="height:56px;margin-bottom:24px" />
        <h2 style="color:#101828;margin:0 0 8px">Welcome to Divyash Digital, ${name}!</h2>
        <p style="color:#667085;margin:0 0 8px">You've been added${designation ? ` as <strong>${designation}</strong>` : ""} with <strong>${role === Role.SUPER_ADMIN ? "Super Admin" : "Account Manager"}</strong> portal access.</p>
        <p style="color:#667085;margin:0 0 24px">Click below to set your password and activate your account. This link expires in 24 hours.</p>
        <a href="${setupUrl}" style="display:inline-block;background:#F05A38;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Set up my account →
        </a>
        <p style="color:#98a2b3;font-size:12px;margin-top:32px">If you weren't expecting this, you can ignore this email.</p>
      </div>
      `
    ).catch((err) => {
      console.error(`[invite] email to ${email} failed (user ${user.id} still created):`, err.message);
    });

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      meta: { name, email, role, designation, clientIds },
    }).catch(() => undefined);
  })
);

// PATCH /api/users/:id — profile completion + later edits
// Accessible by the user themselves or by SUPER_ADMIN
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const isSelf = req.params.id === req.user!.userId;
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;

    if (!isSelf && !isSuperAdmin) throw ApiError.forbidden("Access denied");

    const body = z
      .object({
        name: z.string().min(1).optional(),
        mobile: z.string().optional(),
        address: z.string().optional(),
        designation: z.string().optional(),
        photoUrl: z.string().url().optional(),
        socialLinks: z.string().optional(),
        bankDetails: z.string().optional(),
        reportTypes: z.array(z.nativeEnum(ReportTypeEnum)).optional(),
      })
      .parse(req.body);

    // Only SUPER_ADMIN or self can update bankDetails
    if (body.bankDetails !== undefined && !isSelf && !isSuperAdmin) {
      delete body.bankDetails;
    }

    // Report-type permissions are a privilege grant — SUPER_ADMIN only, even
    // when a member is editing their own profile.
    if (body.reportTypes !== undefined && !isSuperAdmin) {
      delete body.reportTypes;
    }

    // Designation is assigned by SUPER_ADMIN (at invite time, or later from the
    // Team page) — team members, including editing their own profile, cannot
    // change it themselves.
    if (body.designation !== undefined && !isSuperAdmin) {
      delete body.designation;
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("User not found");

    const updatedData: Record<string, unknown> = { ...body };

    // Compute onboardingStatus: COMPLETE when mobile + address + designation are all set
    const newMobile = body.mobile ?? existing.mobile;
    const newAddress = body.address ?? existing.address;
    const newDesignation = body.designation ?? existing.designation;
    if (newMobile && newAddress && newDesignation && existing.onboardingStatus !== OnboardingStatus.COMPLETE) {
      updatedData.onboardingStatus = OnboardingStatus.COMPLETE;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        onboardingStatus: true,
        photoUrl: true,
        mobile: true,
        address: true,
        designation: true,
        socialLinks: true,
        createdAt: true,
      },
    });

    res.json(updated);
  })
);

// PATCH /api/users/:id/clients — SUPER_ADMIN only. Replaces the full list of
// clients THIS teammate is assigned to. Scoped strictly by userId, so it can
// never remove a different teammate's assignment to the same client.
router.patch(
  "/:id/clients",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { clientIds } = z
      .object({ clientIds: z.array(z.string().uuid()).min(1, "Assign at least one client") })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role === Role.CLIENT) throw ApiError.notFound("Team member not found");

    const foundCount = await prisma.client.count({ where: { id: { in: clientIds } } });
    if (foundCount !== clientIds.length) throw ApiError.badRequest("One or more selected clients were not found");

    const userId = req.params.id;
    await prisma.$transaction([
      prisma.clientAssignment.deleteMany({ where: { userId, clientId: { notIn: clientIds } } }),
      ...clientIds.map((clientId) =>
        prisma.clientAssignment.upsert({
          where: { clientId_userId: { clientId, userId } },
          update: {},
          create: { clientId, userId },
        })
      ),
    ]);

    logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      meta: { clientIds },
    }).catch(() => undefined);

    const assignments = await prisma.clientAssignment.findMany({
      where: { userId },
      select: { client: { select: { id: true, companyName: true } } },
    });
    res.json({ managedClients: assignments.map((a) => a.client) });
  })
);

// POST /api/users/:id/photo — upload employee photo to Cloudinary
router.post(
  "/:id/photo",
  photoUpload.single("photo"),
  asyncHandler(async (req, res) => {
    const isSelf = req.params.id === req.user!.userId;
    const isSuperAdmin = req.user!.role === Role.SUPER_ADMIN;
    if (!isSelf && !isSuperAdmin) throw ApiError.forbidden("Access denied");

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("User not found");
    if (!req.file) throw ApiError.badRequest("No file uploaded");

    const [photoUrl] = await Promise.all([
      uploadToCloudinary(req.file.buffer, {
        folder:    "divyash-agency/team-photos",
        public_id: `team-${req.params.id}`,
      }),
      existing.photoUrl ? deleteFromCloudinary(existing.photoUrl) : Promise.resolve(),
    ]);

    await prisma.user.update({ where: { id: req.params.id }, data: { photoUrl } });
    res.json({ photoUrl });
  })
);

// DELETE /api/users/:id — remove a team member (SUPER_ADMIN only, cannot delete yourself)
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) {
      throw ApiError.badRequest("You cannot remove yourself");
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.role === Role.CLIENT) throw ApiError.forbidden("Cannot delete client users here");

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: req.params.id } }),
      prisma.auditLog.updateMany({ where: { userId: req.params.id }, data: { userId: null } }),
      prisma.blogPost.updateMany({ where: { authorId: req.params.id }, data: { authorId: req.user!.userId } }),
      // Drop this teammate's own assignments — any OTHER teammate assigned to
      // the same clients is untouched.
      prisma.clientAssignment.deleteMany({ where: { userId: req.params.id } }),
      prisma.user.delete({ where: { id: req.params.id } }),
    ]);

    res.status(204).send();
  })
);

export default router;
