import { Router } from "express";
import { ClientStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize, scopeToOwnClient } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { notify, notifyAdmins } from "../lib/notify";

const router = Router();
router.use(authenticate);

const clientInputSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  accountManagerId: z.string().uuid().optional(),
  portalPassword: z.string().min(8).optional(), // if set, also creates a portal User account
});

// GET /api/clients — admin/account manager: all clients. Client role: just their own.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.CLIENT) {
      const own = await prisma.client.findUnique({ where: { id: req.user!.clientId! } });
      return res.json(own ? [own] : []);
    }

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { clientServices: true } },
        accountManager: { select: { id: true, name: true } },
      },
    });
    res.json(clients);
  })
);

// GET /api/clients/:clientId
router.get(
  "/:clientId",
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: {
        clientServices: { include: { service: true } },
        accountManager: { select: { id: true, name: true } },
      },
    });
    if (!client) throw ApiError.notFound("Client not found");
    res.json(client);
  })
);

// POST /api/clients — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const { portalPassword, ...clientData } = clientInputSchema.parse(req.body);

    // Check if a User with this email already exists
    if (portalPassword) {
      const existing = await prisma.user.findUnique({ where: { email: clientData.email } });
      if (existing) throw new ApiError(409, "A portal account with this email already exists");
    }

    const client = await prisma.client.create({ data: clientData });

    let portalUser: { id: string } | null = null;
    if (portalPassword) {
      const passwordHash = await bcrypt.hash(portalPassword, 10);
      portalUser = await prisma.user.create({
        data: {
          name: client.contactPerson,
          email: client.email,
          passwordHash,
          role: Role.CLIENT,
          clientId: client.id,
        },
        select: { id: true },
      });
    }

    // Audit + notifications (fire-and-forget — don't block the response)
    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      meta: { companyName: client.companyName, email: client.email },
    }).catch(() => undefined);

    // Notify account manager if one is assigned
    if (client.accountManagerId) {
      notify(
        client.accountManagerId,
        "CLIENT_ONBOARDED",
        `New client onboarded: ${client.companyName}`,
        `/admin/clients/${client.id}`
      ).catch(() => undefined);
    }

    // Notify the client's portal user if one was created
    if (portalUser) {
      notify(
        portalUser.id,
        "WELCOME",
        `Welcome to Divyash Digital! Your portal account is ready.`,
        `/client/dashboard`
      ).catch(() => undefined);
    }

    res.status(201).json({ ...client, portalAccountCreated: !!portalPassword });
  })
);

// PATCH /api/clients/:clientId — admin only
router.patch(
  "/:clientId",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = clientInputSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data,
    });
    res.json(client);
  })
);

// PATCH /api/clients/:clientId/status — admin only
// Suspend / reactivate / deactivate a client account.
router.patch(
  "/:clientId/status",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const { status, reason, notes } = z
      .object({
        status: z.nativeEnum(ClientStatus),
        reason: z.enum(["NON_PAYMENT", "CLIENT_REQUESTED", "POLICY_VIOLATION", "OTHER"]),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const existing = await prisma.client.findUnique({ where: { id: req.params.clientId } });
    if (!existing) throw ApiError.notFound("Client not found");

    const updated = await prisma.client.update({
      where: { id: req.params.clientId },
      data: {
        status,
        suspensionReason: reason,
        suspensionNotes: notes ?? null,
        suspendedAt: status === ClientStatus.ACTIVE ? null : new Date(),
        suspendedBy: status === ClientStatus.ACTIVE ? null : req.user!.userId,
      },
    });

    const actionLabel =
      status === ClientStatus.SUSPENDED
        ? "suspended"
        : status === ClientStatus.ACTIVE
        ? "reactivated"
        : "deactivated";

    logAudit({
      userId: req.user!.userId,
      action: `CLIENT_${actionLabel.toUpperCase()}`,
      entity: "Client",
      entityId: existing.id,
      meta: { companyName: existing.companyName, reason, notes, previousStatus: existing.status },
    }).catch(() => undefined);

    if (existing.accountManagerId && existing.accountManagerId !== req.user!.userId) {
      notify(
        existing.accountManagerId,
        "CLIENT_STATUS_CHANGED",
        `${existing.companyName} has been ${actionLabel} (${reason}).`,
        `/admin/clients/${existing.id}`
      ).catch(() => undefined);
    } else {
      notifyAdmins(
        "CLIENT_STATUS_CHANGED",
        `${existing.companyName} has been ${actionLabel} (${reason}).`,
        `/admin/clients/${existing.id}`
      ).catch(() => undefined);
    }

    res.json(updated);
  })
);

// DELETE /api/clients/:clientId — super admin only
router.delete(
  "/:clientId",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw ApiError.notFound("Client not found");

    // Collect IDs of child records that have their own children
    const [clientServices, invoices] = await Promise.all([
      prisma.clientService.findMany({ where: { clientId }, select: { id: true } }),
      prisma.invoice.findMany({ where: { clientId }, select: { id: true } }),
    ]);
    const csIds  = clientServices.map((cs) => cs.id);
    const invIds = invoices.map((inv) => inv.id);

    // Delete all nested children in dependency order before deleting the client.
    // User.clientId is an optional FK — PostgreSQL will SET NULL it automatically.
    await prisma.$transaction(async (tx) => {
      // Invoice grandchildren
      await tx.reminderLog.deleteMany({ where: { invoiceId: { in: invIds } } });
      await tx.payment.deleteMany({ where: { invoiceId: { in: invIds } } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invIds } } });
      // Invoice children
      await tx.invoice.deleteMany({ where: { clientId } });

      // ClientService children
      await tx.post.deleteMany({ where: { clientServiceId: { in: csIds } } });
      await tx.campaign.deleteMany({ where: { clientServiceId: { in: csIds } } });
      await tx.clientService.deleteMany({ where: { clientId } });

      // Direct client children
      await tx.lead.deleteMany({ where: { clientId } });
      await tx.report.deleteMany({ where: { clientId } });

      await tx.client.delete({ where: { id: clientId } });
    });

    res.status(204).send();
  })
);

export default router;
