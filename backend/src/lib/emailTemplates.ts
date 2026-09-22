import { ReminderType } from "@prisma/client";

const BRAND = "#6366F1";
const BASE_URL = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Divyash Digital</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND};padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Divyash Digital</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Divyash Digital &nbsp;·&nbsp; info@divyashdigital.co.in &nbsp;·&nbsp; +91 99589 15844
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6B7280;width:120px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#101828;font-weight:600;">${value}</td>
  </tr>`;
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:11px 24px;background:${BRAND};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${text}</a>`;
}

function fmtCurrency(v: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Payment receipt ─────────────────────────────────────────────────────── */
export function paymentReceiptHtml(opts: {
  clientName: string;
  invoiceNumber: string;
  invoiceId: string;
  paymentAmount: number | string;
  paymentMethod: string;
  paidAt: Date | string;
  totalAmount: number | string;
  amountDue: number;
}): string {
  const { clientName, invoiceNumber, invoiceId, paymentAmount, paymentMethod, paidAt, totalAmount, amountDue } = opts;
  const methodLabel: Record<string, string> = {
    RAZORPAY: "Razorpay", BANK_TRANSFER: "Bank Transfer", CASH: "Cash", OTHER: "Other",
  };

  const body = `
    <h2 style="margin:0 0 4px;font-size:18px;color:#101828;">Payment received ✓</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">Hi ${clientName}, we've received your payment. Here are the details.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      ${row("Invoice", invoiceNumber)}
      ${row("Amount paid", fmtCurrency(paymentAmount))}
      ${row("Method", methodLabel[paymentMethod] ?? paymentMethod)}
      ${row("Date", fmtDate(paidAt))}
      ${row("Invoice total", fmtCurrency(totalAmount))}
      ${amountDue > 0 ? row("Balance due", `<span style="color:#DC2626;">${fmtCurrency(amountDue)}</span>`) : row("Status", '<span style="color:#059669;">Fully paid</span>')}
    </table>

    ${btn("View invoice", `${BASE_URL}/client/invoices/${invoiceId}`)}

    <p style="margin-top:24px;font-size:13px;color:#6B7280;">
      If you have any questions, reply to this email or contact us at +91 99589 15844.
    </p>`;

  return base(body);
}

/* ── Invoice reminder ────────────────────────────────────────────────────── */
export function invoiceReminderHtml(opts: {
  clientName: string;
  invoiceNumber: string;
  invoiceId: string;
  totalAmount: number | string;
  amountDue: number;
  dueDate: Date | string;
  type: ReminderType;
}): string {
  const { clientName, invoiceNumber, invoiceId, totalAmount, amountDue, dueDate, type } = opts;

  const config = {
    PRE_DUE: {
      subject: "friendly reminder",
      headline: "Payment due soon",
      intro: `This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> is due on <strong>${fmtDate(dueDate)}</strong>.`,
      color: "#D97706",
    },
    DUE: {
      subject: "due today",
      headline: "Invoice due today",
      intro: `Invoice <strong>${invoiceNumber}</strong> is due today, <strong>${fmtDate(dueDate)}</strong>. Please arrange payment at your earliest convenience.`,
      color: "#D97706",
    },
    OVERDUE: {
      subject: "overdue notice",
      headline: "Invoice overdue",
      intro: `Invoice <strong>${invoiceNumber}</strong> was due on <strong>${fmtDate(dueDate)}</strong> and is now overdue. Please settle the outstanding balance to avoid service interruption.`,
      color: "#DC2626",
    },
  }[type];

  const body = `
    <h2 style="margin:0 0 4px;font-size:18px;color:#101828;">${config.headline}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">Hi ${clientName}, ${config.intro}</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      ${row("Invoice", invoiceNumber)}
      ${row("Invoice total", fmtCurrency(totalAmount))}
      ${row("Amount due", `<span style="color:${config.color};font-weight:700;">${fmtCurrency(amountDue)}</span>`)}
      ${row("Due date", fmtDate(dueDate))}
    </table>

    ${btn("Pay now / View invoice", `${BASE_URL}/client/invoices/${invoiceId}`)}

    <p style="margin-top:24px;font-size:13px;color:#6B7280;">
      Questions? Contact us at info@divyashdigital.co.in or +91 99589 15844.
    </p>`;

  return base(body);
}

/* ── Subject lines ───────────────────────────────────────────────────────── */
export function paymentReceiptSubject(invoiceNumber: string) {
  return `Payment received – ${invoiceNumber} | Divyash Digital`;
}

export function reminderSubject(invoiceNumber: string, type: ReminderType) {
  const labels: Record<ReminderType, string> = {
    PRE_DUE: "Payment reminder",
    DUE:     "Invoice due today",
    OVERDUE: "Overdue invoice notice",
  };
  return `${labels[type]} – ${invoiceNumber} | Divyash Digital`;
}
