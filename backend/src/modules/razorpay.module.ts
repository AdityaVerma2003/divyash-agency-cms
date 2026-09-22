import { Router } from "express";
import { createHmac } from "crypto";
import { InvoiceStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getRazorpay } from "../lib/razorpay";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth.middleware";
import { notify, notifyAdmins } from "../lib/notify";
import { logAudit } from "../lib/audit";
import { sendEmail } from "../lib/email";
import { paymentReceiptHtml, paymentReceiptSubject } from "../lib/emailTemplates";

const router = Router();

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Shared payment-recording logic — used by /verify and /webhook. */
async function recordRazorpayPayment(opts: {
  invoiceId: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  paidAmtINR: number;
  recordedByUserId?: string;
}) {
  const { invoiceId, gatewayPaymentId, gatewayOrderId, paidAmtINR, recordedByUserId } = opts;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, client: true, items: true },
  });
  if (!invoice) return null;

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount:           paidAmtINR,
      method:           PaymentMethod.RAZORPAY,
      gatewayPaymentId,
      status:           PaymentStatus.SUCCESS,
      paidAt:           new Date(),
    },
  });

  const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0) + paidAmtINR;
  const newStatus = totalPaid >= Number(invoice.totalAmount) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
  const amountDue = Math.max(0, Number(invoice.totalAmount) - totalPaid);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus, paidAt: newStatus === InvoiceStatus.PAID ? new Date() : null },
  });

  const msg = `Razorpay payment of ₹${paidAmtINR.toLocaleString("en-IN")} received for ${invoice.invoiceNumber}.`;

  // Notify client portal user
  const clientUser = await prisma.user.findFirst({
    where: { clientId: invoice.clientId, role: Role.CLIENT },
    select: { id: true },
  });
  if (clientUser) {
    notify(clientUser.id, "PAYMENT_RECORDED", msg, `/client/invoices/${invoiceId}`).catch(() => undefined);
  }

  // Notify admins with the correct admin-facing link
  notifyAdmins(
    "PAYMENT_RECORDED",
    `${msg} (${invoice.client.companyName})`,
    `/admin/invoices/${invoiceId}`
  ).catch(() => undefined);

  // Send receipt email
  sendEmail(
    invoice.client.email,
    paymentReceiptSubject(invoice.invoiceNumber),
    paymentReceiptHtml({
      clientName:    invoice.client.companyName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId,
      paymentAmount: paidAmtINR,
      paymentMethod: "RAZORPAY",
      paidAt:        new Date(),
      totalAmount:   Number(invoice.totalAmount),
      amountDue,
    })
  ).catch(() => undefined);

  logAudit({
    userId: recordedByUserId,
    action: "PAYMENT_RECORDED",
    entity: "Payment",
    entityId: payment.id,
    meta: { invoiceId, amount: paidAmtINR, method: "RAZORPAY", gatewayPaymentId, gatewayOrderId, newStatus },
  }).catch(() => undefined);

  return { payment, newStatus, amountDue };
}

/* ── POST /api/razorpay/orders ─────────────────────────────────────────────
   Creates a Razorpay order for the outstanding balance of an invoice.
*/
router.post(
  "/orders",
  authenticate,
  asyncHandler(async (req, res) => {
    const { invoiceId } = z.object({ invoiceId: z.string().uuid() }).parse(req.body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, client: true },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    // Clients may only pay their own invoices
    if (req.user!.role === Role.CLIENT && invoice.clientId !== req.user!.clientId) {
      throw ApiError.forbidden("You can only pay your own invoices");
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw ApiError.badRequest("Invoice is already fully paid");
    }

    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const amountDue = Math.max(0, Number(invoice.totalAmount) - totalPaid);
    if (amountDue <= 0) throw ApiError.badRequest("No outstanding balance");

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   Math.round(amountDue * 100),  // paise
      currency: "INR",
      receipt:  invoice.invoiceNumber,
      notes:    { invoiceId: invoice.id, clientId: invoice.clientId },
    });

    res.json({
      orderId:     order.id,
      amount:      order.amount,     // paise
      amountInINR: amountDue,
      currency:    order.currency,
      keyId:       process.env.RAZORPAY_KEY_ID,
      invoiceNumber: invoice.invoiceNumber,
      clientName:    invoice.client.companyName,
    });
  })
);

/* ── POST /api/razorpay/verify ─────────────────────────────────────────────
   Called by the frontend after successful checkout.
   Security checks (in order):
     1. HMAC-SHA256 signature verification
     2. Fetch payment + order from Razorpay API (server-to-server)
     3. Verify order.notes.invoiceId matches the claimed invoiceId (replay prevention)
     4. Verify payment.order_id matches the claimed order_id (swap prevention)
     5. Verify paid amount ≥ expected outstanding balance (amount tampering prevention)
     6. Idempotency: skip if already recorded for this exact payment_id + invoice_id
*/
router.post(
  "/verify",
  authenticate,
  asyncHandler(async (req, res) => {
    const body = z.object({
      razorpay_order_id:   z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature:  z.string().min(1),
      invoiceId:           z.string().uuid(),
    }).parse(req.body);

    // ── 1. Env guard ──────────────────────────────────────────────
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw ApiError.internalError("Payment gateway not configured");
    }

    // ── 2. HMAC-SHA256 signature verification ─────────────────────
    const expectedSig = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");

    if (!timingSafeEqual(expectedSig, body.razorpay_signature)) {
      throw ApiError.badRequest("Invalid payment signature");
    }

    // ── 3. Idempotency check — with cross-invoice validation ───────
    const existing = await prisma.payment.findFirst({
      where: { gatewayPaymentId: body.razorpay_payment_id },
    });
    if (existing) {
      // Payment ID already recorded — ensure it's for THIS invoice (replay attack prevention)
      if (existing.invoiceId !== body.invoiceId) {
        throw ApiError.badRequest("Payment ID does not match this invoice");
      }
      const invoice = await prisma.invoice.findUnique({
        where: { id: body.invoiceId },
        include: { items: true, payments: true, client: true },
      });
      return res.json({ alreadyRecorded: true, invoice });
    }

    // ── 4. Fetch payment + order from Razorpay (server-to-server) ─
    const razorpay  = getRazorpay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rzpPayment: any;
    try {
      rzpPayment = await razorpay.payments.fetch(body.razorpay_payment_id);
    } catch {
      throw ApiError.badRequest("Could not verify payment with Razorpay");
    }

    // ── 5. Verify payment belongs to the claimed order ─────────────
    if (rzpPayment.order_id !== body.razorpay_order_id) {
      throw ApiError.badRequest("Payment does not belong to the stated order");
    }

    // ── 6. Verify order notes match the claimed invoiceId ──────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rzpOrder: any;
    try {
      rzpOrder = await razorpay.orders.fetch(body.razorpay_order_id);
    } catch {
      throw ApiError.badRequest("Could not verify order with Razorpay");
    }
    const noteInvoiceId = (rzpOrder.notes as Record<string, string>)?.invoiceId;
    if (noteInvoiceId !== body.invoiceId) {
      throw ApiError.badRequest("Order was not created for this invoice");
    }

    // ── 7. Verify payment is captured / authorised ─────────────────
    if (rzpPayment.status !== "captured" && rzpPayment.status !== "authorized") {
      throw ApiError.badRequest(`Payment status is '${rzpPayment.status}', not captured`);
    }

    // ── 8. Validate amount against outstanding balance ─────────────
    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      include: { payments: true, client: true },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    if (req.user!.role === Role.CLIENT && invoice.clientId !== req.user!.clientId) {
      throw ApiError.forbidden("You can only pay your own invoices");
    }

    const totalPaid   = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const amountDue   = Math.max(0, Number(invoice.totalAmount) - totalPaid);
    const paidAmtINR  = Number(rzpPayment.amount) / 100;

    // Allow up to ₹1 rounding tolerance; reject anything meaningfully short
    if (paidAmtINR < amountDue - 1) {
      throw ApiError.badRequest(
        `Payment amount ₹${paidAmtINR} is less than outstanding balance ₹${amountDue}`
      );
    }

    // ── 9. Record payment ──────────────────────────────────────────
    await recordRazorpayPayment({
      invoiceId:        body.invoiceId,
      gatewayPaymentId: body.razorpay_payment_id,
      gatewayOrderId:   body.razorpay_order_id,
      paidAmtINR,
      recordedByUserId: req.user!.userId,
    });

    const updated = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      include: { items: true, payments: true, client: true },
    });
    res.json({ invoice: updated });
  })
);

/* ── POST /api/razorpay/webhook ────────────────────────────────────────────
   Handles payment.captured events.
   ALWAYS requires RAZORPAY_WEBHOOK_SECRET — rejects without it.
*/
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[webhook] RAZORPAY_WEBHOOK_SECRET is not set — rejecting all webhook calls");
      return res.status(400).json({ message: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    if (!signature) {
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (!timingSafeEqual(expected, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event   = req.body?.event as string;
    const entity  = req.body?.payload?.payment?.entity;

    if (event === "payment.captured" && entity) {
      const { id: gatewayPaymentId, order_id: gatewayOrderId, amount, notes } = entity;
      const invoiceId = (notes as Record<string, string>)?.invoiceId;

      if (!invoiceId) {
        return res.json({ received: true, skipped: "no invoiceId in notes" });
      }

      // Idempotency: skip if /verify already recorded this payment
      const exists = await prisma.payment.findFirst({
        where: { gatewayPaymentId },
      });
      if (!exists) {
        const paidAmtINR = Number(amount) / 100;
        await recordRazorpayPayment({ invoiceId, gatewayPaymentId, gatewayOrderId, paidAmtINR });
        console.log(`[webhook] payment.captured recorded — invoice ${invoiceId} ₹${paidAmtINR}`);
      }
    }

    res.json({ received: true });
  })
);

/* ── Timing-safe string comparison ──────────────────────────────────────── */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  try {
    return require("crypto").timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}

export default router;
