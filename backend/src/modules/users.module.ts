import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendEmail } from "../lib/email";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN));

// GET /api/users — list all non-client team members
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { not: Role.CLIENT } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  })
);

// POST /api/users — invite a new team member
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, role } = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum([Role.ACCOUNT_MANAGER, Role.SUPER_ADMIN]),
      })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict("A user with this email already exists");

    // Unusable random password — they'll set their own via the reset link
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash: randomPasswordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Immediately generate a password-reset token so they can set their own password
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for first-time setup

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: tokenHash, resetTokenExpiresAt: expiresAt },
    });

    const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
    const setupUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await sendEmail(
      email,
      "You've been invited to Divyash Digital",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <img src="${origin}/logo.webp" alt="Divyash Digital" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#101828;margin:0 0 8px">Welcome to Divyash Digital, ${name}!</h2>
        <p style="color:#667085;margin:0 0 8px">You've been added as <strong>${role === Role.SUPER_ADMIN ? "Super Admin" : "Account Manager"}</strong>.</p>
        <p style="color:#667085;margin:0 0 24px">Click below to set your password and activate your account. This link expires in 24 hours.</p>
        <a href="${setupUrl}" style="display:inline-block;background:#F05A38;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Set up my account
        </a>
        <p style="color:#98a2b3;font-size:12px;margin-top:32px">If you weren't expecting this, you can ignore this email.</p>
      </div>
      `
    );

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      meta: { name, email, role },
    }).catch(() => undefined);

    res.status(201).json(user);
  })
);

// DELETE /api/users/:id — remove a team member (cannot delete yourself)
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) {
      throw ApiError.badRequest("You cannot remove yourself");
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.role === Role.CLIENT) throw ApiError.forbidden("Cannot delete client users here");

    // Delete dependent records that have RESTRICT foreign keys before deleting the user
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: req.params.id } }),
      prisma.auditLog.updateMany({ where: { userId: req.params.id }, data: { userId: null } }),
      prisma.blogPost.updateMany({ where: { authorId: req.params.id }, data: { authorId: req.user!.userId } }),
      prisma.user.delete({ where: { id: req.params.id } }),
    ]);

    res.status(204).send();
  })
);

export default router;
