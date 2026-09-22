"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { Invoice } from "@/types";

type PaymentMethod = "RAZORPAY" | "BANK_TRANSFER" | "CASH" | "OTHER";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  RAZORPAY: "Razorpay",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
  OTHER: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-[var(--surface-2)] text-[var(--muted)]",
  SENT: "bg-coral-100 text-coral-600",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-danger",
};

function Badge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  const label = status.replace(/_/g, " ");
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  );
}

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Record payment modal ─────────────────────────────────────────────────────

interface RecordPaymentModalProps {
  invoiceId: string;
  outstandingBalance: number;
  onClose: () => void;
  onRecorded: () => void;
}

function RecordPaymentModal({
  invoiceId,
  outstandingBalance,
  onClose,
  onRecorded,
}: RecordPaymentModalProps) {
  const { success, error: toastError } = useToast();
  const [amount, setAmount] = useState(outstandingBalance > 0 ? String(outstandingBalance) : "");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [gatewayId, setGatewayId] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    if (!amount || Number(amount) <= 0) {
      setAmountError("Enter a positive amount");
      return false;
    }
    setAmountError(undefined);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        amount: Number(amount),
        method,
      };
      if (method === "RAZORPAY" && gatewayId.trim()) {
        payload.gatewayPaymentId = gatewayId.trim();
      }
      await api.post(`/invoices/${invoiceId}/payments`, payload, getAccessToken());
      success("Payment recorded", `₹${Number(amount).toLocaleString("en-IN")} via ${METHOD_LABELS[method]}`);
      onRecorded();
    } catch (err) {
      toastError("Could not record payment", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500";

  return (
    <Modal title="Record payment" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Amount (₹) <span className="text-danger">*</span>
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              className={`${inputBase} ${amountError ? "border-danger" : "border-[var(--border)]"}`}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError(undefined);
              }}
            />
            {amountError && <p className="mt-1 text-xs text-danger">{amountError}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Payment method</span>
            <select
              className={`${inputBase} border-[var(--border)]`}
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {method === "RAZORPAY" && (
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Gateway payment ID</span>
              <input
                type="text"
                className={`${inputBase} border-[var(--border)]`}
                value={gatewayId}
                onChange={(e) => setGatewayId(e.target.value)}
                placeholder="pay_..."
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Recording…" : "Record payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { error: toastError } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.get<Invoice>(`/invoices/${id}`, getAccessToken());
      setInvoice(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  if (fetchError) return <p className="text-sm text-danger">{fetchError}</p>;
  if (!invoice) return null;

  const payments = invoice.payments ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(0, Number(invoice.totalAmount) - totalPaid);

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/invoices" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to invoices
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          {invoice.status !== "PAID" && (
            <button
              onClick={() => setShowPayment(true)}
              className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Record payment
            </button>
          )}
        </div>
      </div>

      {/* Invoice heading */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">{invoice.invoiceNumber}</h1>
        <Badge status={invoice.status} />
      </div>

      {/* Meta card */}
      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Details
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <InfoRow label="Client" value={invoice.client?.companyName ?? "—"} />
          <InfoRow
            label="Period"
            value={`${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
          />
          <InfoRow label="Due date" value={formatDate(invoice.dueDate)} />
          <InfoRow label="Issued" value={formatDate(invoice.issuedDate)} />
          {invoice.paidAt && <InfoRow label="Paid on" value={formatDate(invoice.paidAt)} />}
        </dl>
      </div>

      {/* Line items */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Line items
        </p>
        <div className="card overflow-x-auto overflow-hidden p-0">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--ink)]">{item.description}</td>
                  <td className="px-4 py-3 text-right text-[var(--muted)]">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-[var(--border)] px-4 py-3">
            <div className="ml-auto w-full max-w-xs space-y-1.5">
              <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <TotalRow label="Tax" value={formatCurrency(invoice.taxAmount)} />
              <div className="border-t border-[var(--border)] pt-1.5">
                <TotalRow
                  label="Total"
                  value={formatCurrency(invoice.totalAmount)}
                  bold
                />
              </div>
              {invoice.status !== "PAID" && outstanding > 0 && (
                <div className="border-t border-[var(--border)] pt-1.5">
                  <TotalRow
                    label="Outstanding"
                    value={formatCurrency(outstanding)}
                    highlight
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Payment history */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Payment history
        </p>
        {payments.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-[var(--muted)]">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto overflow-hidden p-0">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Method</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.paidAt ? formatDate(p.paidAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--ink)]">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record payment modal */}
      {showPayment && (
        <RecordPaymentModal
          invoiceId={id}
          outstandingBalance={outstanding}
          onClose={() => setShowPayment(false)}
          onRecorded={() => {
            setShowPayment(false);
            loadInvoice();
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? "text-danger" : bold ? "text-ink font-medium" : "text-[var(--muted)]"}>
        {label}
      </span>
      <span className={highlight ? "font-medium text-danger" : bold ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"}>
        {value}
      </span>
    </div>
  );
}
