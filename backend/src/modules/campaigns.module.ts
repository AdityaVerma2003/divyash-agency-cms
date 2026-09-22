import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

const campaignInputSchema = z.object({
  clientServiceId: z.string().uuid(),
  month: z.coerce.date(),
  spend: z.number().min(0).default(0),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  conversions: z.number().int().min(0).default(0),
  roas: z.number().min(0).default(0),
});

// GET /api/campaigns?clientServiceId=...
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const clientServiceId = req.query.clientServiceId as string | undefined;
    if (!clientServiceId) throw new ApiError(400, "clientServiceId query param is required");

    // CLIENT role: verify this clientService belongs to their client
    if (req.user!.role === Role.CLIENT) {
      const cs = await prisma.clientService.findUnique({ where: { id: clientServiceId } });
      if (!cs || cs.clientId !== req.user!.clientId) throw ApiError.forbidden("Access denied");
    }

    const campaigns = await prisma.campaign.findMany({
      where: { clientServiceId },
      orderBy: { month: "desc" },
    });
    res.json(campaigns);
  })
);

// POST /api/campaigns — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = campaignInputSchema.parse(req.body);
    const campaign = await prisma.campaign.create({ data });
    res.status(201).json(campaign);
  })
);

// DELETE /api/campaigns/:id — admin only
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) throw ApiError.notFound("Campaign not found");
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
