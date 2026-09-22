import { BillingCycle, InvoiceStatus, Role, ReminderType, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { notify, notifyAdmins } from "./notify";
import { logAudit } from "./audit";
import { sendEmail } from "./email";
import { invoiceReminderHtml, reminderSubject } from "./emailTemplates";

export interface BillingRunResult {
  generated: number;
  skipped: number;
  errors: number;
  invoices: { clientName: string; invoiceNumber: string; total: number }[];
}

/**
 * Generates one invoice per client for each of their ACTIVE MONTHLY subscriptions
 * that haven't already been billed for the given month.
 *
 * Safe to run multiple times in the same month — duplicate invoices are skipped.
 */
export async function generateMonthlyInvoices(
  forDate: Date = new Date()
): Promise<BillingRunResult> {
  const periodStart = new Date(forDate.getFullYear(), forDate.getMonth(), 1);
  const periodEnd   = new Date(forDate.getFullYear(), forDate.getMonth() + 1, 0); // last day
  const dueDate     = new Date(forDate.getFullYear(), forDate.getMonth() + 1, 15); // 15th next month

  const result: BillingRunResult = { generated: 0, skipped: 0, errors: 0, invoices: [] };

  // Fetch all active monthly subscriptions grouped by client
  const activeServices = await prisma.clientService.findMany({
    where: { billingCycle: BillingCycle.MONTHLY, status: SubscriptionStatus.ACTIVE },
    include: { service: true, client: true },
    orderBy: { clientId: "asc" },
  });

  if (activeServices.length === 0) return result;

  // Group by clientId
  const byClient = new Map<string, typeof activeServices>();
  for (const cs of activeServices) {
    const list = byClient.get(cs.clientId) ?? [];
    list.push(cs);
    byClient.set(cs.clientId, list);
  }

  for (const [clientId, services] of byClient) {
    try {
      // Skip if this client already has an invoice for this period
      const existing = await prisma.invoice.findFirst({
        where: {
          clientId,
          periodStart: { gte: periodStart },
          periodEnd:   { lte: new Date(periodEnd.getTime() + 86_400_000) }, // lte end-of-day
        },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      const items = services.map((cs) => ({
        clientServiceId: cs.id,
        description: cs.service.name,
        amount: Number(cs.rate),
      }));

      const subtotal    = items.reduce((s, i) => s + i.amount, 0);
      const totalAmount = subtotal; // no tax on auto-generated invoices

      const invoiceCount  = await prisma.invoice.count();
      const invoiceNumber = `INV-${forDate.getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;

      const invoice = await prisma.invoice.create({
        data: {
          clientId,
          invoiceNumber,
          periodStart,
          periodEnd,
          dueDate,
          subtotal,
          taxAmount: 0,
          totalAmount,
          status: InvoiceStatus.SENT,
          items: { create: items },
        },
      });

      // Notify the client's portal user
      const clientUser = await prisma.user.findFirst({
        where: { clientId, role: Role.CLIENT },
        select: { id: true },
      });
      if (clientUser) {
        notify(
          clientUser.id,
          "INVOICE_CREATED",
          `Invoice ${invoiceNumber} for ₹${totalAmount.toLocaleString("en-IN")} has been issued for ${periodStart.toLocaleString("en-IN", { month: "long", year: "numeric" })}.`,
          `/client/invoices/${invoice.id}`
        ).catch(() => undefined);
      }

      // Notify admins with the admin-facing link
      notifyAdmins(
        "INVOICE_CREATED",
        `Auto-invoice ${invoiceNumber} generated for ${services[0].client.companyName} — ₹${totalAmount.toLocaleString("en-IN")} due ${dueDate.toLocaleDateString("en-IN")}.`,
        `/admin/invoices/${invoice.id}`
      ).catch(() => undefined);

      logAudit({
        action: "AUTO_INVOICE_GENERATED",
        entity: "Invoice",
        entityId: invoice.id,
        meta: { invoiceNumber, clientId, totalAmount, periodStart, periodEnd, trigger: "cron" },
      }).catch(() => undefined);

      result.generated++;
      result.invoices.push({
        clientName: services[0].client.companyName,
        invoiceNumber,
        total: totalAmount,
      });
    } catch (err) {
      console.error(`[billing] Error generating invoice for client ${clientId}:`, err);
      result.errors++;
    }
  }

  return result;
}

/* ── Invoice reminders + overdue marking ──────────────────────────────── */

export interface ReminderRunResult {
  overdueMark: number;
  emailsSent: number;
  errors: number;
}

/**
 * Run daily:
 * - Marks past-due SENT/PARTIALLY_PAID invoices as OVERDUE
 * - Sends PRE_DUE reminder 3 days before due date
 * - Sends DUE reminder on the due date
 * - Sends OVERDUE reminder for newly overdue invoices
 * Skips if the same reminder type was already sent for this invoice.
 */
export async function sendInvoiceReminders(asOf: Date = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { overdueMark: 0, emailsSent: 0, errors: 0 };

  const today     = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const in3Days   = new Date(today); in3Days.setDate(today.getDate() + 3);
  const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // Fetch all open invoices with client info + existing reminders
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
    include: { client: true, payments: true, reminders: true },
  });

  for (const inv of invoices) {
    try {
      const dueDate   = new Date(inv.dueDate);
      const dueDateNorm = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const amountDue = Math.max(0, Number(inv.totalAmount) - totalPaid);
      const alreadySent = (type: ReminderType) => inv.reminders.some((r) => r.type === type);

      const clientEmail = inv.client.email;
      const clientName  = inv.client.companyName;

      // ── Mark overdue ──────────────────────────────────────────────
      if (dueDateNorm < today && inv.status !== InvoiceStatus.OVERDUE) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: InvoiceStatus.OVERDUE },
        });
        result.overdueMark++;
      }

      // ── Determine which reminder to send ──────────────────────────
      let reminderType: ReminderType | null = null;

      if (dueDateNorm < today && !alreadySent(ReminderType.OVERDUE)) {
        reminderType = ReminderType.OVERDUE;
      } else if (dueDateNorm.getTime() === today.getTime() && !alreadySent(ReminderType.DUE)) {
        reminderType = ReminderType.DUE;
      } else if (dueDateNorm.getTime() === in3Days.getTime() && !alreadySent(ReminderType.PRE_DUE)) {
        reminderType = ReminderType.PRE_DUE;
      }

      if (!reminderType) continue;

      // ── Send email ────────────────────────────────────────────────
      const html = invoiceReminderHtml({
        clientName,
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        totalAmount: Number(inv.totalAmount),
        amountDue,
        dueDate: inv.dueDate,
        type: reminderType,
      });

      await sendEmail(clientEmail, reminderSubject(inv.invoiceNumber, reminderType), html);

      await prisma.reminderLog.create({ data: { invoiceId: inv.id, type: reminderType } });

      result.emailsSent++;
    } catch (err) {
      console.error(`[reminders] Error processing invoice ${inv.id}:`, err);
      result.errors++;
    }
  }

  return result;
}
