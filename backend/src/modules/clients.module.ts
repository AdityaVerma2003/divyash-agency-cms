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
  intro: z.string().max(280).optional(),
  portalPassword: z.string().min(8).optional(), // if set, also creates a portal User account
  showOnPublicSite: z.boolean().optional(),
  // Team member(s) to assign on creation — mandatory, same as inviting a new
  // teammate (see users.module.ts). Additive: never touches any OTHER
  // client's assignments for these same users. Under .partial() (PATCH
  // /:clientId, which never acts on this field anyway) this stays optional.
  assignedUserIds: z.array(z.string().uuid()).min(1, "Assign at least one team member"),
});

const clientAssignmentsInclude = {
  assignments: {
    include: { user: { select: { id: true, name: true, designation: true } } },
  },
} as const;

// GET /api/clients — SUPER_ADMIN: all clients (full row — contact details,
// GSTIN, agreement). CLIENT: just their own. Team members must not reach
// this at all — they read client info via the ClientLite projection at
// /workspace/clients instead.
router.get(
  "/",
  authorize(Role.SUPER_ADMIN, Role.CLIENT),
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.CLIENT) {
      const own = await prisma.client.findUnique({
        where: { id: req.user!.clientId! },
        include: clientAssignmentsInclude,
      });
      return res.json(own ? [own] : []);
    }

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { clientServices: true } },
        ...clientAssignmentsInclude,
      },
    });
    res.json(clients);
  })
);

// GET /api/clients/:clientId — same SUPER_ADMIN / own-CLIENT restriction as above
router.get(
  "/:clientId",
  authorize(Role.SUPER_ADMIN, Role.CLIENT),
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: {
        clientServices: { include: { service: true } },
        ...clientAssignmentsInclude,
      },
    });
    if (!client) throw ApiError.notFound("Client not found");
    res.json(client);
  })
);

/** Throws if any id doesn't refer to a real, non-CLIENT team member. */
async function assertValidTeamMembers(userIds: string[] | undefined) {
  if (!userIds || userIds.length === 0) return;
  const found = await prisma.user.findMany({ where: { id: { in: userIds } } });
  if (found.length !== userIds.length || found.some((u) => u.role === Role.CLIENT)) {
    throw ApiError.badRequest("One or more selected team members are invalid");
  }
}

// POST /api/clients — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { portalPassword, assignedUserIds, ...clientData } = clientInputSchema.parse(req.body);
    await assertValidTeamMembers(assignedUserIds);

    // Check if a User with this email already exists
    if (portalPassword) {
      const existing = await prisma.user.findUnique({ where: { email: clientData.email } });
      if (existing) throw new ApiError(409, "A portal account with this email already exists");
    }

    const client = await prisma.client.create({
      data: {
        ...clientData,
        ...(assignedUserIds && assignedUserIds.length > 0
          ? { assignments: { create: assignedUserIds.map((userId) => ({ userId })) } }
          : {}),
      },
      include: clientAssignmentsInclude,
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

    // Notify every assigned team member
    for (const a of client.assignments) {
      notify(
        a.userId,
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
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    // Team assignment edits go through PATCH /:clientId/team instead — kept
    // separate so this endpoint can't accidentally wipe existing assignments.
    const { assignedUserIds: _ignored, ...data } = clientInputSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data,
      include: clientAssignmentsInclude,
    });
    res.json(client);
  })
);

// PATCH /api/clients/:clientId/team — admin only
// Replaces the full team roster for THIS client only (add/remove checkboxes
// from the client's own edit page). Never touches any other client's rows,
// so it can't accidentally unassign a team member from a different client.
router.patch(
  "/:clientId/team",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { userIds } = z
      .object({ userIds: z.array(z.string().uuid()).min(1, "Assign at least one team member") })
      .parse(req.body);
    await assertValidTeamMembers(userIds);

    const clientId = req.params.clientId;
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) throw ApiError.notFound("Client not found");

    await prisma.$transaction([
      prisma.clientAssignment.deleteMany({ where: { clientId, userId: { notIn: userIds } } }),
      ...userIds.map((userId) =>
        prisma.clientAssignment.upsert({
          where: { clientId_userId: { clientId, userId } },
          update: {},
          create: { clientId, userId },
        })
      ),
    ]);

    const client = await prisma.client.findUnique({ where: { id: clientId }, include: clientAssignmentsInclude });
    res.json(client);
  })
);

// PATCH /api/clients/:clientId/status — admin only
// Suspend / reactivate / deactivate a client account.
router.patch(
  "/:clientId/status",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { status, reason, notes } = z
      .object({
        status: z.nativeEnum(ClientStatus),
        reason: z.enum(["NON_PAYMENT", "CLIENT_REQUESTED", "POLICY_VIOLATION", "OTHER"]),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const existing = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: clientAssignmentsInclude,
    });
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

    const assignedUserIds = existing.assignments.map((a) => a.userId).filter((id) => id !== req.user!.userId);
    if (assignedUserIds.length > 0) {
      for (const userId of assignedUserIds) {
        notify(
          userId,
          "CLIENT_STATUS_CHANGED",
          `${existing.companyName} has been ${actionLabel} (${reason}).`,
          `/admin/clients/${existing.id}`
        ).catch(() => undefined);
      }
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
  authorize(Role.SUPER_ADMIN),
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

/** Shared by the admin-facing route (by clientId param) and the client-portal route (by session).
 *  Returns per-member session activity — a client can now have several team
 *  members assigned, so this is a list rather than a single assignee. */
async function getTeamActivity(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, designation: true, photoUrl: true } } },
      },
    },
  });
  if (!client) throw ApiError.notFound("Client not found");

  const members = await Promise.all(
    client.assignments.map(async (a) => {
      const sessions = await prisma.userSession.findMany({
        where: { userId: a.user.id },
        orderBy: { loginAt: "desc" },
        take: 50,
      });

      // Only closed sessions count toward total active time — an open session
      // (no logoutAt) means they're either still online or simply closed the
      // tab without logging out, and we don't want to guess a fake duration.
      const totalActiveMinutes = sessions.reduce((sum, s) => {
        if (!s.logoutAt) return sum;
        return sum + Math.round((s.logoutAt.getTime() - s.loginAt.getTime()) / 60000);
      }, 0);

      return {
        member: a.user,
        sessions: sessions.map((s) => ({
          id: s.id,
          loginAt: s.loginAt,
          logoutAt: s.logoutAt,
          durationMinutes: s.logoutAt ? Math.round((s.logoutAt.getTime() - s.loginAt.getTime()) / 60000) : null,
        })),
        totalActiveMinutes,
      };
    })
  );

  return { members };
}

// GET /api/clients/:clientId/team-activity — the assigned team member's portal
// session history (in-time/out-time + active duration). SUPER_ADMIN or the
// owning CLIENT only — an ACCOUNT_MANAGER has no need to see login activity
// for clients (or teammates) outside their own assignments.
router.get(
  "/:clientId/team-activity",
  authorize(Role.SUPER_ADMIN, Role.CLIENT),
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

// ── Public clients router (/api/public/clients) ───────────────────────────────
// Unauthenticated — only clients the admin has opted into showing on the
// public "Our Work" page, each paired with their case study if one exists.

export const publicClientsRouter = Router();

publicClientsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      where: { showOnPublicSite: true },
      orderBy: { onboardedAt: "desc" },
      include: {
        caseStudies: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    res.json(
      clients.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        intro: c.intro,
        caseStudy: c.caseStudies[0]
          ? { id: c.caseStudies[0].id, title: c.caseStudies[0].title, pdfUrl: c.caseStudies[0].pdfUrl }
          : null,
      }))
    );
  })
);

export default router;
