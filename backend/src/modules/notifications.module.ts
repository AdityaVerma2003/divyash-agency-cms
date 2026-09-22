import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// GET /api/notifications — current user's notifications, newest first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  })
);

// GET /api/notifications/unread-count — fast badge count
router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ count });
  })
);

// PATCH /api/notifications/:id/read — mark one notification read
router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) throw ApiError.notFound("Notification not found");
    if (notification.userId !== req.user!.userId) throw ApiError.forbidden();

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(updated);
  })
);

// PATCH /api/notifications/read-all — mark all as read
router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ updated: count });
  })
);

// GET /api/notifications/admin — all users' notifications, admin only
router.get(
  "/admin",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (req.query.isRead !== undefined) where.isRead = req.query.isRead === "true";
    if (req.query.type) where.type = req.query.type as string;
    if (req.query.from || req.query.to) {
      where.createdAt = {
        ...(req.query.from ? { gte: new Date(req.query.from as string) } : {}),
        ...(req.query.to   ? { lte: new Date(req.query.to   as string) } : {}),
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ notifications, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

export default router;
