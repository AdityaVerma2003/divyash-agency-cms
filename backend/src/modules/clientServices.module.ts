import { Router } from "express";
import { BillingCycle, Role, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize, scopeToOwnClient } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { notify, notifyAdmins } from "../lib/notify";

const router = Router();
router.use(authenticate);

const subscriptionInputSchema = z.object({
  clientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  billingCycle: z.nativeEnum(BillingCycle).default(BillingCycle.MONTHLY),
  rate: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  contractDurationMonths: z.number().int().positive().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
});

// GET /api/client-services?clientId=... — subscriptions for one client
// (clients are scoped to their own; admins can pass any clientId)
router.get(
  "/",
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    const clientId =
      req.user!.role === Role.CLIENT ? req.user!.clientId! : (req.query.clientId as string | undefined);

    const subscriptions = await prisma.clientService.findMany({
      where: clientId ? { clientId } : undefined,
      include: { service: true, client: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(subscriptions);
  })
);

// POST /api/client-services — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = subscriptionInputSchema.parse(req.body);
    const subscription = await prisma.clientService.create({ data });

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "ClientService",
      entityId: subscription.id,
      meta: { clientId: data.clientId, serviceId: data.serviceId, rate: data.rate },
    }).catch(() => undefined);

    res.status(201).json(subscription);
  })
);

// PATCH /api/client-services/:id — admin only (general field updates)
router.patch(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = subscriptionInputSchema.partial().parse(req.body);
    const subscription = await prisma.clientService.update({
      where: { id: req.params.id },
      data,
      include: { service: true },
    });
    res.json(subscription);
  })
);

const statusChangeSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus),
  reason: z.enum(["NON_PAYMENT", "CLIENT_REQUESTED", "SERVICE_ISSUE", "OTHER"]),
  notes: z.string().optional(),
});

// PATCH /api/client-services/:id/status — admin only
// Pause / resume / end a subscription with a reason and audit trail.
router.patch(
  "/:id/status",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const { status, reason, notes } = statusChangeSchema.parse(req.body);

    const existing = await prisma.clientService.findUnique({
      where: { id: req.params.id },
      include: { service: true, client: true },
    });
    if (!existing) throw ApiError.notFound("Subscription not found");

    const updated = await prisma.clientService.update({
      where: { id: req.params.id },
      data: {
        status,
        pauseReason: reason,
        pauseNotes: notes ?? null,
        statusChangedAt: new Date(),
        statusChangedBy: req.user!.userId,
      },
      include: { service: true },
    });

    const actionLabel =
      status === SubscriptionStatus.PAUSED
        ? "paused"
        : status === SubscriptionStatus.ACTIVE
        ? "resumed"
        : "ended";

    logAudit({
      userId: req.user!.userId,
      action: `SERVICE_${actionLabel.toUpperCase()}`,
      entity: "ClientService",
      entityId: updated.id,
      meta: { service: updated.service.name, client: existing.client.companyName, reason, notes },
    }).catch(() => undefined);

    // Notify the account manager if one is assigned
    if (existing.client.accountManagerId) {
      notify(
        existing.client.accountManagerId,
        "SERVICE_STATUS_CHANGED",
        `${existing.client.companyName}: ${existing.service.name} has been ${actionLabel} (${reason}).`,
        `/admin/clients/${existing.clientId}`
      ).catch(() => undefined);
    } else {
      // No account manager — notify all admins
      notifyAdmins(
        "SERVICE_STATUS_CHANGED",
        `${existing.client.companyName}: ${existing.service.name} has been ${actionLabel} (${reason}).`,
        `/admin/clients/${existing.clientId}`
      ).catch(() => undefined);
    }

    res.json(updated);
  })
);

export default router;
