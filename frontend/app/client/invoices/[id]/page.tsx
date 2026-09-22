"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { Invoice } from "@/types";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(method: string) {
  const MAP: Record<string, string> = {
    RAZORPAY: "Razorpay",
    BANK_TRANSFER: "Bank transfer",
    CASH: "Cash",
    OTHER: "Other",
  };
  return MAP[method] ?? method;
}

/* ── Status badge ────────────────────────────────────────────────────────── */
const INV_STATUS: Record<Invoice["status"], { cls: string; label: string }> = {
  DRAFT: { cls: "bg-[var(--surface-2)] text-[var(--muted)]", label: "Draft" },
  SENT: {
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    label: "Sent",
  },
  PARTIALLY_PAID: {
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Partially paid",
  },
  PAID: {
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    label: "Paid",
  },
  OVERDUE: {
    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    label: "Overdue",
  },
};

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const cfg = INV_STATUS[status];
  return <span className={`badge whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      {/* Back link */}
      <div className="h-4 w-28 rounded-md bg-[var(--border)] opacity-40" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 rounded-lg bg-[var(--border)] opacity-50" />
        <div className="h-6 w-20 rounded-full bg-[var(--border)] opacity-30" />
      </div>
      {/* Two-col layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-[var(--border)] opacity-30" />
          <div className="h-52 rounded-2xl bg-[var(--border)] opacity-20" />
          <div className="h-28 rounded-2xl bg-[var(--border)] opacity-20" />
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-[var(--border)] opacity-30" />
          <div className="h-36 rounded-2xl bg-[var(--border)] opacity-20" />
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
interface RzpOrderResponse {
  orderId: string;
  amount: number;
  amountInINR: number;
  currency: string;
  keyId: string;
  invoiceNumber: string;
  clientName: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function ClientInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { error: toastError, success: toastSuccess } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);

  async function handlePayNow() {
    if (!invoice) return;
    setPaying(true);
    try {
      const token  = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

      // 1. Create Razorpay order
      const orderRes = await fetch(`${apiUrl}/razorpay/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Could not create payment order");
      }
      const order: RzpOrderResponse = await orderRes.json();

      // 2. Load checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay checkout");

      // 3. Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         order.keyId,
          amount:      order.amount,
          currency:    order.currency,
          order_id:    order.orderId,
          name:        "Divyash Digital",
          description: `Invoice ${order.invoiceNumber}`,
          prefill:     { name: order.clientName },
          theme:       { color: "#6366F1" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify + record payment
              const verifyRes = await fetch(`${apiUrl}/razorpay/verify`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ ...response, invoiceId: invoice.id }),
              });
              if (!verifyRes.ok) throw new Error("Payment verification failed");
              const data: { invoice: Invoice } = await verifyRes.json();
              setInvoice(data.invoice);
              toastSuccess("Payment successful", `₹${order.amountInINR.toLocaleString("en-IN")} received. A receipt has been sent to your email.`);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "dismissed") toastError("Payment failed", msg);
    } finally {
      setPaying(false);
    }
  }

  async function downloadPdf() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/invoices/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError("Download failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    const token = getAccessToken();
    api
      .get<Invoice>(`/invoices/${id}`, token)
      .then(setInvoice)
      .catch((err: Error) => {
        toastError("Failed to load invoice", err.message);
        setFetchError(err.message);
      });
  }, [id, toastError]);

  if (fetchError) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          href="/client/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          All invoices
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
          {fetchError}
        </div>
      </div>
    );
  }

  if (!invoice) return <LoadingSkeleton />;

  /* ── Derived values ─────────────────────────────────────────────────── */
  const payments = invoice.payments ?? [];
  const items = invoice.items ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const amountDue = Math.max(0, Number(invoice.totalAmount) - totalPaid);

  const statusCfg = INV_STATUS[invoice.status];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Back link ───────────────────────────────────────────────────── */}
      <Link
        href="/client/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        All invoices
      </Link>

      {/* ── Invoice header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-extrabold text-[var(--ink)] leading-tight">
          Invoice{" "}
          <span className="font-mono">{invoice.invoiceNumber}</span>
        </h1>
        <StatusBadge status={invoice.status} />
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Invoice details card */}
          <div className="card">
            <p className="section-label mb-4">Invoice details</p>
            <div className="grid grid-cols-1 gap-y-3 gap-x-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--muted)] font-medium mb-0.5">Period</p>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] font-medium mb-0.5">Issued date</p>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {formatDate(invoice.issuedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] font-medium mb-0.5">Due date</p>
                <p
                  className={`text-sm font-semibold ${
                    invoice.status === "OVERDUE" ? "text-red-600 dark:text-red-400" : "text-[var(--ink)]"
                  }`}
                >
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs text-[var(--muted)] font-medium mb-0.5">Paid at</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line items card */}
          <div className="card">
            <p className="section-label mb-4">Line items</p>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-2 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide pr-4">
                      Description
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-sm text-[var(--muted)]">
                        No line items recorded.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3 pr-4 text-[var(--ink)]">{item.description}</td>
                        <td className="py-3 text-right font-mono tabular-nums text-[var(--ink)]">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-[var(--border)]">
                  <tr>
                    <td className="pt-3 pb-1 text-xs text-[var(--muted)]">Subtotal</td>
                    <td className="pt-3 pb-1 text-right font-mono tabular-nums text-xs text-[var(--muted)]">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pb-1 text-xs text-[var(--muted)]">Tax</td>
                    <td className="pb-1 text-right font-mono tabular-nums text-xs text-[var(--muted)]">
                      {formatCurrency(invoice.taxAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pt-2 text-sm font-bold text-[var(--ink)]">Total</td>
                    <td className="pt-2 text-right font-mono tabular-nums text-sm font-bold text-[var(--ink)]">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment history card */}
          <div className="card">
            <p className="section-label mb-4">Payment history</p>
            {payments.length > 0 ? (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="pb-2 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide pr-4">
                        Date
                      </th>
                      <th className="pb-2 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide pr-4">
                        Method
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3 pr-4 text-[var(--ink)]">
                          {p.paidAt ? formatDate(p.paidAt) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-[var(--muted)]">
                          {methodLabel(p.method)}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : invoice.status === "PAID" ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Fully paid.
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">No payments recorded yet.</p>
            )}
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────── */}
        <div className="space-y-4 lg:self-start lg:sticky lg:top-6">

          {/* Amount summary card */}
          <div className="card">
            <p className="section-label mb-4">Amount summary</p>
            <p className="font-display text-3xl font-extrabold tabular-nums text-[var(--ink)] leading-none">
              {formatCurrency(invoice.totalAmount)}
            </p>
            <p className="mt-1 mb-5 text-xs text-[var(--muted)]">Total invoice amount</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Amount paid</span>
                <span className="font-semibold text-[var(--ink)] tabular-nums font-mono">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-[var(--border)] pt-3">
                <span className="font-semibold text-[var(--ink)]">Amount due</span>
                <span
                  className={`font-bold tabular-nums font-mono text-base ${
                    amountDue > 0
                      ? "text-coral-500"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>

            {/* Pay Now button — shown when there's an outstanding balance */}
            {invoice.status !== "PAID" && amountDue > 0 && (
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors shadow-sm shadow-brand-500/20"
              >
                {paying ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Opening checkout…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Pay ₹{amountDue.toLocaleString("en-IN")} now
                  </>
                )}
              </button>
            )}

            {invoice.status === "PAID" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Invoice fully paid
                </span>
              </div>
            )}

            {invoice.status === "OVERDUE" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Payment overdue
                </span>
              </div>
            )}
          </div>

          {/* Download PDF */}
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Generating PDF…" : "Download Invoice PDF"}
          </button>

          {/* Contact card */}
          <div className="card">
            <p className="section-label mb-2">Questions about this invoice?</p>
            <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
              Reach out to your account team and we'll help sort it out.
            </p>
            <div className="space-y-2">
              <a
                href="tel:+918810376026"
                className="btn btn-ghost w-full justify-start text-left"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +91 88103 76026
              </a>
              <a
                href="mailto:info@divyashdigital.co.in?subject=Invoice Query"
                className="btn btn-ghost w-full justify-start text-left"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                info@divyashdigital.co.in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
