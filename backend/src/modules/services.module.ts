import { Router } from "express";
import { Role, ServiceCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

const serviceInputSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(ServiceCategory),
  description: z.string().optional(),
});

// GET /api/services — SUPER_ADMIN only. Team members read service names via
// the ClientLite projection (/workspace/clients), never the raw catalog.
router.get(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    res.json(services);
  })
);

// POST /api/services — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = serviceInputSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  })
);

// PATCH /api/services/:serviceId — admin only
router.patch(
  "/:serviceId",
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = serviceInputSchema.partial().parse(req.body);
    const service = await prisma.service.update({
      where: { id: req.params.serviceId },
      data,
    });
    res.json(service);
  })
);

export default router;
