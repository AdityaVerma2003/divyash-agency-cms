import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { generateMonthlyInvoices, sendInvoiceReminders } from "../lib/billing";

const router = Router();
router.use(authenticate, authorize(Role.SUPER_ADMIN));

const runSchema = z.object({
  year:  z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),   // 1-based
});

// POST /api/billing/run — manually trigger invoice generation for a given month
router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const { year, month } = runSchema.parse(req.body);

    const now = new Date();
    const forDate = new Date(year ?? now.getFullYear(), (month ?? now.getMonth() + 1) - 1, 1);

    const result = await generateMonthlyInvoices(forDate);
    res.json(result);
  })
);

// POST /api/billing/send-reminders — manually trigger reminder emails
router.post(
  "/send-reminders",
  asyncHandler(async (req, res) => {
    const result = await sendInvoiceReminders();
    res.json(result);
  })
);

export default router;
