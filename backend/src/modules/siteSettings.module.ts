import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";

const SINGLETON = "singleton";

async function getSettings() {
  return prisma.siteSetting.upsert({
    where: { id: SINGLETON },
    update: {},
    create: { id: SINGLETON },
  });
}

// ── Public router — read-only maintenance flag ───────────────────────────
// Unauthenticated on purpose: the Next.js middleware polls this to decide
// whether to serve the maintenance page. Only maintenance fields are exposed.

export const publicSiteSettingsRouter = Router();

publicSiteSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getSettings();
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    res.json({
      maintenanceEnabled: settings.maintenanceEnabled,
      maintenanceMessage: settings.maintenanceMessage,
      maintenanceEndsAt: settings.maintenanceEndsAt,
    });
  })
);

// ── Admin router — SUPER_ADMIN only ──────────────────────────────────────

export const adminSiteSettingsRouter = Router();
adminSiteSettingsRouter.use(authenticate);
adminSiteSettingsRouter.use(authorize(Role.SUPER_ADMIN));

const maintenanceSchema = z.object({
  maintenanceEnabled: z.boolean(),
  maintenanceMessage: z.string().max(500).optional().or(z.literal("")),
  maintenanceEndsAt: z.coerce.date().optional().nullable(),
});

const reportLockSchema = z.object({
  reportLockDayOfMonth: z.number().int().min(1).max(28),
});

adminSiteSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getSettings();
    const updatedBy = settings.updatedById
      ? await prisma.user.findUnique({
          where: { id: settings.updatedById },
          select: { id: true, name: true },
        })
      : null;
    res.json({ ...settings, updatedBy });
  })
);

// PATCH /api/admin/maintenance — takes the public site + client portal down
adminSiteSettingsRouter.patch(
  "/maintenance",
  asyncHandler(async (req, res) => {
    const data = maintenanceSchema.parse(req.body);
    const current = await getSettings();

    const settings = await prisma.siteSetting.update({
      where: { id: SINGLETON },
      data: {
        maintenanceEnabled: data.maintenanceEnabled,
        maintenanceMessage: data.maintenanceMessage || null,
        maintenanceEndsAt: data.maintenanceEndsAt ?? null,
        // Stamp the start only on the transition into maintenance
        maintenanceStartedAt:
          data.maintenanceEnabled && !current.maintenanceEnabled ? new Date() : current.maintenanceStartedAt,
        updatedById: req.user!.userId,
      },
    });

    logAudit({
      userId: req.user!.userId,
      action: data.maintenanceEnabled ? "MAINTENANCE_ON" : "MAINTENANCE_OFF",
      entity: "SiteSetting",
      entityId: SINGLETON,
      meta: { message: settings.maintenanceMessage },
    }).catch(() => undefined);

    res.json(settings);
  })
);

// PATCH /api/admin/maintenance/report-lock — cutoff day for freezing a month
adminSiteSettingsRouter.patch(
  "/report-lock",
  asyncHandler(async (req, res) => {
    const { reportLockDayOfMonth } = reportLockSchema.parse(req.body);
    const settings = await prisma.siteSetting.update({
      where: { id: SINGLETON },
      data: { reportLockDayOfMonth, updatedById: req.user!.userId },
    });
    logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entity: "SiteSetting",
      entityId: SINGLETON,
      meta: { reportLockDayOfMonth },
    }).catch(() => undefined);
    res.json(settings);
  })
);
