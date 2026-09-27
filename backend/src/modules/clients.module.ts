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
  // null explicitly clears the assignment; omitted leaves it untouched
  accountManagerId: z.string().uuid().nullable().optional(),
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

/** Throws if `accountManagerId` is set but doesn't refer to a real, non-CLIENT team member. */
async function assertValidAccountManager(accountManagerId: string | null | undefined) {
  if (!accountManagerId) return;
  const manager = await prisma.user.findUnique({ where: { id: accountManagerId } });
  if (!manager || manager.role === Role.CLIENT) {
    throw ApiError.badRequest("Selected team member is invalid");
  }
}

// POST /api/clients — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const { portalPassword, ...clientData } = clientInputSchema.parse(req.body);
    await assertValidAccountManager(clientData.accountManagerId);

    // Check if a User with this email already exists
    if (portalPassword) {
      const existing = await prisma.user.findUnique({ where: { email: clientData.email } });
      if (existing) throw new ApiError(409, "A portal account with this email already exists");
    }

    const client = await prisma.client.create({
      data: clientData,
      include: { accountManager: { select: { id: true, name: true } } },
    });

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
    await assertValidAccountManager(data.accountManagerId);
    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data,
      include: { accountManager: { select: { id: true, name: true } } },
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

// PATCH /api/clients/:clientId/agreement — update plain-text agreement details
router.patch(
  "/:clientId/agreement",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const { agreementDetails } = z
      .object({ agreementDetails: z.string().max(1000).optional() })
      .parse(req.body);

    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data: { agreementDetails: agreementDetails ?? null },
    });
    res.json({ agreementDetails: client.agreementDetails });
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
      await tx.clientReport.deleteMany({ where: { clientId } });
      await tx.caseStudy.deleteMany({ where: { clientId } });

      await tx.client.delete({ where: { id: clientId } });
    });

    res.status(204).send();
  })
);

/** Shared by the admin-facing route (by clientId param) and the client-portal route (by session). */
async function getTeamActivity(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      accountManager: {
        select: { id: true, name: true, designation: true, photoUrl: true },
      },
    },
  });
  if (!client) throw ApiError.notFound("Client not found");

  if (!client.accountManager) {
    return { member: null, sessions: [], totalActiveMinutes: 0 };
  }

  const sessions = await prisma.userSession.findMany({
    where: { userId: client.accountManager.id },
    orderBy: { loginAt: "desc" },
    take: 50,
  });

  // Only closed sessions count toward total active time — an open session (no
  // logoutAt) means they're either still online or simply closed the tab
  // without logging out, and we don't want to guess a fake duration for that.
  const totalActiveMinutes = sessions.reduce((sum, s) => {
    if (!s.logoutAt) return sum;
    return sum + Math.round((s.logoutAt.getTime() - s.loginAt.getTime()) / 60000);
  }, 0);

  return {
    member: client.accountManager,
    sessions: sessions.map((s) => ({
      id: s.id,
      loginAt: s.loginAt,
      logoutAt: s.logoutAt,
      durationMinutes: s.logoutAt ? Math.round((s.logoutAt.getTime() - s.loginAt.getTime()) / 60000) : null,
    })),
    totalActiveMinutes,
  };
}

// GET /api/clients/:clientId/team-activity — the assigned team member's portal
// session history (in-time/out-time + active duration). Admin/account manager
// can view any client's; a CLIENT is restricted to their own via scopeToOwnClient.
router.get(
  "/:clientId/team-activity",
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    res.json(await getTeamActivity(req.params.clientId));
  })
);

// ── Client portal router (/api/portal/team-activity) ──────────────────────────
// Mirrors the pattern in clientReports.module.ts: CLIENT-only, scoped to their
// own clientId from the session rather than a URL param.

export const portalTeamActivityRouter = Router();
portalTeamActivityRouter.use(authenticate);

portalTeamActivityRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.CLIENT) throw ApiError.forbidden("Access denied");
    const clientId = req.user!.clientId;
    if (!clientId) throw ApiError.forbidden("No client associated with this account");
    res.json(await getTeamActivity(clientId));
  })
);

export default router;
