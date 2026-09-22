import { Router } from "express";
import { InvoiceStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { z } from "zod";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize, scopeToOwnClient } from "../middleware/auth.middleware";
import { logAudit } from "../lib/audit";
import { notify, notifyAdmins } from "../lib/notify";
import { sendEmail } from "../lib/email";
import { paymentReceiptHtml, paymentReceiptSubject } from "../lib/emailTemplates";

const router = Router();
router.use(authenticate);

const invoiceItemSchema = z.object({
  clientServiceId: z.string().uuid().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
});

const invoiceInputSchema = z.object({
  clientId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxAmount: z.number().min(0).default(0),
  items: z.array(invoiceItemSchema).min(1),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  gatewayPaymentId: z.string().optional(),
});

// GET /api/invoices?clientId=... — admins see all/filtered, clients see only their own
router.get(
  "/",
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    const clientId =
      req.user!.role === Role.CLIENT ? req.user!.clientId! : (req.query.clientId as string | undefined);

    const invoices = await prisma.invoice.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { id: true, companyName: true } }, payments: true },
      orderBy: { issuedDate: "desc" },
    });
    res.json(invoices);
  })
);

// GET /api/invoices/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true, client: true },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    if (req.user!.role === Role.CLIENT && invoice.clientId !== req.user!.clientId) {
      throw ApiError.forbidden("You can only access your own invoices");
    }
    res.json(invoice);
  })
);

// GET /api/invoices/:id/pdf — download invoice as PDF (admin or owning client)
router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true, client: true },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    if (req.user!.role === Role.CLIENT && invoice.clientId !== req.user!.clientId) {
      throw ApiError.forbidden("You can only access your own invoices");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmt = (v: any) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

    const fmtDate = (d: Date | string) =>
      new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const BRAND = "#6366F1";
    const MUTED  = "#6B7280";
    const INK    = "#101828";
    const LIGHT  = "#F4F5FF";   // very light indigo tint for header rows
    const LINE   = "#E5E7EB";

    const LOGO_PATH = path.join(__dirname, "../../src/assets/logo.png");
    const MARGIN  = 45;
    const PAGE_W  = 595 - MARGIN * 2;   // A4 width = 595pt
    const A4_H    = 841;

    const client = invoice.client as {
      companyName: string; contactPerson: string; email: string;
      address?: string | null; gstin?: string | null;
    };

    // ── Pre-calculate total content height ──────────────────────────
    const clientLines = 3 + (client.address ? 1 : 0) + (client.gstin ? 1 : 0);
    const metaLines   = 5;   // Invoice # · Issued · Due date · Period · Status
    const infoBlockH  = 14 + 12 + Math.max(clientLines, metaLines) * 14 + 18 + 10;

    const itemsH      = 22 + invoice.items.length * 24 + 16; // header + rows + gap
    const totalsH     = 16 + 14 + 14 + 22;                   // subtotal + tax + total
    const paymentsH   = invoice.payments.length > 0
      ? 28 + 20 + invoice.payments.length * 22
      : 0;
    const headerH     = 55;   // logo + divider
    const footerH     = 80;   // generous bottom margin so footer never overlaps content
    const padding     = 40;
    const safetyPad   = 30;   // buffer for text-wrap variances

    const contentH    = headerH + infoBlockH + itemsH + totalsH + paymentsH + footerH + padding + safetyPad;
    const pageH       = Math.max(A4_H, contentH);   // never shrink below A4; expand if needed

    // ── Create document with computed page size ──────────────────────
    const doc = new PDFDocument({
      autoFirstPage: false,
      info: { Title: invoice.invoiceNumber, Author: "Divyash Digital" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    doc.addPage({ size: [595, pageH], margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });

    /* ── Header: logo + brand + invoice title ───────────────────────── */
    const LOGO_SIZE = 36;
    try {
      doc.image(LOGO_PATH, MARGIN, MARGIN, { width: LOGO_SIZE, height: LOGO_SIZE });
    } catch {
      // logo missing — skip silently
    }

    doc.fontSize(15).fillColor(BRAND).font("Helvetica-Bold")
      .text("Divyash Digital", MARGIN + LOGO_SIZE + 8, MARGIN + 4);
    doc.fontSize(8).fillColor(MUTED).font("Helvetica")
      .text("info@divyashdigital.co.in  ·  +91 88103 76026", MARGIN + LOGO_SIZE + 8, MARGIN + 22);

    // Right side — INVOICE heading
    doc.fontSize(22).fillColor(INK).font("Helvetica-Bold")
      .text("INVOICE", MARGIN, MARGIN, { width: PAGE_W, align: "right" });
    doc.fontSize(9).fillColor(MUTED).font("Helvetica")
      .text(invoice.invoiceNumber, MARGIN, MARGIN + 28, { width: PAGE_W, align: "right" });

    // Brand rule
    const ruleY = MARGIN + LOGO_SIZE + 10;
    doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + PAGE_W, ruleY)
      .strokeColor(BRAND).lineWidth(1.5).stroke();

    /* ── Bill-to + invoice meta ─────────────────────────────────────── */
    const COL2 = MARGIN + PAGE_W * 0.55;
    const COL2W = PAGE_W * 0.45;
    let y = ruleY + 14;

    doc.fontSize(7).fillColor(BRAND).font("Helvetica-Bold")
      .text("BILL TO", MARGIN, y)
      .text("INVOICE DETAILS", COL2, y);
    y += 12;

    // Client info (left)
    doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text(client.companyName, MARGIN, y);
    y += 14;
    doc.fontSize(8.5).fillColor(INK).font("Helvetica").text(client.contactPerson, MARGIN, y);
    y += 12;
    doc.fontSize(8.5).fillColor(MUTED).text(client.email, MARGIN, y);
    y += 12;
    if (client.address) { doc.text(client.address, MARGIN, y, { width: PAGE_W * 0.5 }); y += 12; }
    if (client.gstin)   { doc.text(`GSTIN: ${client.gstin}`, MARGIN, y); y += 12; }

    // Meta rows (right) — always start from same baseline
    const metaStartY = ruleY + 26;
    const metaRows: [string, string][] = [
      ["Invoice #",   invoice.invoiceNumber],
      ["Issued",      fmtDate(invoice.issuedDate)],
      ["Due date",    fmtDate(invoice.dueDate)],
      ["Period",      `${fmtDate(invoice.periodStart)} – ${fmtDate(invoice.periodEnd)}`],
      ["Status",      invoice.status.replace(/_/g, " ")],
    ];
    let ry = metaStartY;
    for (const [label, value] of metaRows) {
      doc.fontSize(8).fillColor(MUTED).font("Helvetica").text(label, COL2, ry, { width: 65 });
      doc.fontSize(8).fillColor(INK).font("Helvetica-Bold")
        .text(value, COL2 + 68, ry, { width: COL2W - 68, align: "right" });
      ry += 14;
    }

    y = Math.max(y, ry) + 18;

    /* ── Line items table ───────────────────────────────────────────── */
    // Section label
    doc.fontSize(7).fillColor(BRAND).font("Helvetica-Bold").text("LINE ITEMS", MARGIN, y);
    y += 10;

    // Table header
    doc.rect(MARGIN, y, PAGE_W, 20).fill(LIGHT);
    doc.fontSize(7.5).fillColor(MUTED).font("Helvetica-Bold")
      .text("DESCRIPTION", MARGIN + 8, y + 6.5)
      .text("AMOUNT", MARGIN, y + 6.5, { width: PAGE_W - 8, align: "right" });
    y += 20;

    // Rows
    for (const item of invoice.items) {
      doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.4).stroke();
      doc.fontSize(9).fillColor(INK).font("Helvetica")
        .text(item.description, MARGIN + 8, y + 6, { width: PAGE_W - 100 })
        .text(fmt(item.amount), MARGIN, y + 6, { width: PAGE_W - 8, align: "right" });
      y += 24;
    }
    doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.4).stroke();
    y += 10;

    /* ── Totals ─────────────────────────────────────────────────────── */
    const TR = MARGIN + PAGE_W * 0.52;   // start of totals right block
    const TW = PAGE_W * 0.48;

    const totalRows: [string, string, boolean][] = [
      ["Subtotal", fmt(invoice.subtotal),    false],
      ["Tax",      fmt(invoice.taxAmount),   false],
    ];
    for (const [label, value] of totalRows) {
      doc.fontSize(8.5).fillColor(MUTED).font("Helvetica")
        .text(label, TR, y, { width: TW * 0.5 })
        .text(value, TR, y, { width: TW, align: "right" });
      y += 14;
    }
    // Total divider
    doc.moveTo(TR, y).lineTo(TR + TW, y).strokeColor(LINE).lineWidth(0.4).stroke();
    y += 7;
    doc.fontSize(11).fillColor(INK).font("Helvetica-Bold")
      .text("Total", TR, y, { width: TW * 0.5 })
      .text(fmt(invoice.totalAmount), TR, y, { width: TW, align: "right" });
    y += 22;

    /* ── Payment history ────────────────────────────────────────────── */
    if (invoice.payments.length > 0) {
      y += 6;
      doc.fontSize(7).fillColor(BRAND).font("Helvetica-Bold").text("PAYMENTS RECEIVED", MARGIN, y);
      y += 10;

      doc.rect(MARGIN, y, PAGE_W, 18).fill(LIGHT);
      doc.fontSize(7.5).fillColor(MUTED).font("Helvetica-Bold")
        .text("DATE",   MARGIN + 8, y + 5.5)
        .text("METHOD", MARGIN + 150, y + 5.5)
        .text("AMOUNT", MARGIN, y + 5.5, { width: PAGE_W - 8, align: "right" });
      y += 18;

      for (const p of invoice.payments) {
        doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.4).stroke();
        doc.fontSize(8.5).fillColor(INK).font("Helvetica")
          .text(p.paidAt ? fmtDate(p.paidAt) : "—", MARGIN + 8, y + 5)
          .text((p.method as string).replace(/_/g, " "), MARGIN + 150, y + 5)
          .text(fmt(p.amount), MARGIN, y + 5, { width: PAGE_W - 8, align: "right" });
        y += 20;
      }
      doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.4).stroke();
    }

    /* ── Footer ─────────────────────────────────────────────────────── */
    const footerY = pageH - 38;
    doc.moveTo(MARGIN, footerY).lineTo(MARGIN + PAGE_W, footerY).strokeColor(LINE).lineWidth(0.4).stroke();
    doc.fontSize(7.5).fillColor(MUTED).font("Helvetica")
      .text(
        "Divyash Digital  ·  info@divyashdigital.co.in  ·  +91 88103 76026  ·  divyashdigital.co.in",
        MARGIN, footerY + 10,
        { width: PAGE_W, align: "center" },
      );

    doc.end();
  })
);

// POST /api/invoices — admin only, manual invoice creation
// (auto-generation from active ClientService rows lands in the billing-core phase)
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = invoiceInputSchema.parse(req.body);
    const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = subtotal + data.taxAmount;

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        invoiceNumber,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        subtotal,
        taxAmount: data.taxAmount,
        totalAmount,
        status: InvoiceStatus.SENT,
        items: { create: data.items },
      },
      include: { items: true },
    });

    // Notify the client's portal user about the new invoice
    const clientUser = await prisma.user.findFirst({
      where: { clientId: data.clientId, role: Role.CLIENT },
      select: { id: true },
    });
    if (clientUser) {
      notify(
        clientUser.id,
        "INVOICE_CREATED",
        `Invoice ${invoiceNumber} for ₹${totalAmount.toLocaleString("en-IN")} has been issued.`,
        `/client/invoices/${invoice.id}`
      ).catch(() => undefined);
    }
    // Notify admins so they can track what was issued
    notifyAdmins(
      "INVOICE_CREATED",
      `Invoice ${invoiceNumber} issued to client — ₹${totalAmount.toLocaleString("en-IN")}.`,
      `/admin/invoices/${invoice.id}`
    ).catch(() => undefined);

    logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
      meta: { invoiceNumber, clientId: data.clientId, totalAmount },
    }).catch(() => undefined);

    res.status(201).json(invoice);
  })
);

// POST /api/invoices/:id/payments — record a payment against an invoice
router.post(
  "/:id/payments",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (req, res) => {
    const data = recordPaymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { payments: true, client: true },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: data.amount,
        method: data.method,
        gatewayPaymentId: data.gatewayPaymentId,
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    const totalPaid =
      invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + Number(payment.amount);
    const newStatus =
      totalPaid >= Number(invoice.totalAmount) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus, paidAt: newStatus === InvoiceStatus.PAID ? new Date() : null },
    });

    // Notify client's portal user + send payment receipt email
    const clientUser = await prisma.user.findFirst({
      where: { clientId: invoice.clientId, role: Role.CLIENT },
      select: { id: true },
    });
    if (clientUser) {
      notify(
        clientUser.id,
        "PAYMENT_RECORDED",
        `Payment of ₹${Number(data.amount).toLocaleString("en-IN")} received for ${invoice.invoiceNumber}.`,
        `/client/invoices/${invoice.id}`
      ).catch(() => undefined);
    }
    // Notify admins with the correct admin-facing link
    notifyAdmins(
      "PAYMENT_RECORDED",
      `Payment of ₹${Number(data.amount).toLocaleString("en-IN")} recorded for ${invoice.invoiceNumber} (${invoice.client.companyName}).`,
      `/admin/invoices/${invoice.id}`
    ).catch(() => undefined);

    // Fire-and-forget payment receipt email to the client
    const amountDue = Math.max(0, Number(invoice.totalAmount) - totalPaid);
    sendEmail(
      invoice.client.email,
      paymentReceiptSubject(invoice.invoiceNumber),
      paymentReceiptHtml({
        clientName:    invoice.client.companyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId:     invoice.id,
        paymentAmount: data.amount,
        paymentMethod: data.method,
        paidAt:        payment.paidAt ?? new Date(),
        totalAmount:   Number(invoice.totalAmount),
        amountDue,
      })
    ).catch(() => undefined);

    logAudit({
      userId: req.user!.userId,
      action: "PAYMENT_RECORDED",
      entity: "Payment",
      entityId: payment.id,
      meta: { invoiceId: invoice.id, amount: data.amount, method: data.method, newStatus },
    }).catch(() => undefined);

    res.status(201).json(payment);
  })
);

export default router;
