import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth.middleware";
import { sendEmail } from "../lib/email";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
};

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: { select: { status: true } } },
    });
    if (!user) throw ApiError.unauthorized("Invalid email or password");

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw ApiError.unauthorized("Invalid email or password");

    // Enforce client account status for CLIENT-role users
    if (user.role === "CLIENT" && user.client) {
      if (user.client.status === "INACTIVE") {
        throw new ApiError(403, "This account is no longer active. Please contact Divyash Digital.");
      }
      // SUSPENDED: allow login but flag it in the response
    }

    const clientStatus = user.role === "CLIENT" ? (user.client?.status ?? "ACTIVE") : undefined;

    const payload = { userId: user.id, role: user.role, clientId: user.clientId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        clientStatus,
      },
    });
  })
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) throw ApiError.unauthorized("Missing refresh token");

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Strip registered JWT claims (iat, exp) before re-signing
    const { userId, role, clientId } = payload;
    const accessToken = signAccessToken({ userId, role, clientId });
    res.json({ accessToken });
  })
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Always respond generically — don't reveal whether email exists
    const GENERIC_MSG = "If an account with that email exists, a reset link has been sent.";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: GENERIC_MSG });
      return;
    }

    // Generate a random token, store its hash (like passwords — never store raw)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: tokenHash, resetTokenExpiresAt: expiresAt },
    });

    const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await sendEmail(
      email,
      "Reset your Divyash Digital password",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <img src="${origin}/logo.webp" alt="Divyash Digital" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#101828;margin:0 0 8px">Reset your password</h2>
        <p style="color:#667085;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#F05A38;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Reset password
        </a>
        <p style="color:#98a2b3;font-size:12px;margin-top:32px">If you didn't request this, you can safely ignore this email.</p>
      </div>
      `
    );

    res.json({ message: GENERIC_MSG });
  })
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { email, token, newPassword } = z
      .object({
        email: z.string().email(),
        token: z.string().min(1),
        newPassword: z.string().min(8),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetToken ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw ApiError.badRequest("Reset link is invalid or has expired");
    }

    const tokenMatches = await bcrypt.compare(token, user.resetToken);
    if (!tokenMatches) throw ApiError.badRequest("Reset link is invalid or has expired");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    });

    res.json({ message: "Password updated successfully. You can now log in." });
  })
);

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  res.status(204).send();
});

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, clientId: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    res.json(user);
  })
);

export default router;
