import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { notify } from "../lib/notify";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  company: z.string().optional(),
  service: z.string().min(1),
  message: z.string().optional(),
});

// POST /api/contact — public, no auth required
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = contactSchema.parse(req.body);
    const contact = await prisma.contactRequest.create({ data });

    // Notify all SUPER_ADMINs
    const admins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        notify(a.id, "CONTACT_REQUEST", `New audit request from ${data.name} (${data.company ?? data.email}) — ${data.service}`, `/admin/contacts`)
          .catch(() => undefined)
      )
    );

    res.status(201).json({ success: true, id: contact.id });
  })
);

// GET /api/contact — admin only, list all requests
router.get(
  "/",
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === "true";

    const where = unreadOnly ? { isRead: false } : {};
    const [requests, total] = await Promise.all([
      prisma.contactRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.contactRequest.count({ where }),
    ]);
    res.json({ requests, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

// PATCH /api/contact/:id/read — mark as read
router.patch(
  "/:id/read",
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const contact = await prisma.contactRequest.findUnique({ where: { id: req.params.id } });
    if (!contact) throw ApiError.notFound("Contact request not found");
    const updated = await prisma.contactRequest.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json(updated);
  })
);

export default router;
