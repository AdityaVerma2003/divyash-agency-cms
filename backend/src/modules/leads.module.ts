import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

const leadInputSchema = z.object({
  clientId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  month: z.coerce.date(),
  count: z.number().int().min(0).default(0),
  revenueAttributed: z.number().min(0).default(0),
});

// GET /api/leads?clientId=...
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // CLIENT role: always scope to own client
    const clientId =
      req.user!.role === Role.CLIENT
        ? req.user!.clientId!
        : (req.query.clientId as string | undefined);

    if (!clientId) throw new ApiError(400, "clientId query param is required");

    // CLIENT role: ensure they only access their own data
    if (req.user!.role === Role.CLIENT && clientId !== req.user!.clientId) {
      throw ApiError.forbidden("Access denied");
    }

    const leads = await prisma.lead.findMany({
      where: { clientId },
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { month: "desc" },
    });
    res.json(leads);
  })
);

// POST /api/leads — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = leadInputSchema.parse(req.body);
    const lead = await prisma.lead.create({
      data: { ...data, serviceId: data.serviceId ?? null },
    });
    res.status(201).json(lead);
  })
);

// DELETE /api/leads/:id — admin only
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) throw ApiError.notFound("Lead not found");
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
