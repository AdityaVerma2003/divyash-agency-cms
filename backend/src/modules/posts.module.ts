import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

const postInputSchema = z.object({
  clientServiceId: z.string().uuid(),
  platform: z.string().min(1),
  postUrl: z.string().url().optional().or(z.literal("")),
  publishedAt: z.coerce.date(),
  reach: z.number().int().min(0).default(0),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
});

// GET /api/posts?clientServiceId=...
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

    const posts = await prisma.post.findMany({
      where: { clientServiceId },
      orderBy: { publishedAt: "desc" },
    });
    res.json(posts);
  })
);

// POST /api/posts — admin only
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = postInputSchema.parse(req.body);
    const post = await prisma.post.create({
      data: { ...data, postUrl: data.postUrl || null },
    });
    res.status(201).json(post);
  })
);

// DELETE /api/posts/:id — admin only
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw ApiError.notFound("Post not found");
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
