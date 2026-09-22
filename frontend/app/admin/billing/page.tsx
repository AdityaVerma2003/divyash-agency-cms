"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";

interface BillingRunResult {
  generated: number;
  skipped: number;
  errors: number;
  invoices: { clientName: string; invoiceNumber: string; total: number }[];
}

interface ReminderRunResult {
  overdueMark: number;
  emailsSent: number;
  errors: number;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BillingPage() {
  const { success, error: toastError } = useToast();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<BillingRunResult | null>(null);
  const [reminding, setReminding] = useState(false);
  const [reminderResult, setReminderResult] = useState<ReminderRunResult | null>(null);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  async function runBilling() {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.post<BillingRunResult>("/billing/run", { year, month }, getAccessToken());
      setResult(res);
      if (res.generated > 0) {
        success(
          `${res.generated} invoice${res.generated !== 1 ? "s" : ""} generated`,
          `${res.skipped} already billed, ${res.errors} errors`
        );
      } else if (res.skipped > 0 && res.generated === 0) {
        success("All clients already billed", `${res.skipped} client${res.skipped !== 1 ? "s" : ""} skipped`);
      } else {
        success("No active subscriptions", "No MONTHLY active client services found");
      }
    } catch (err) {
      toastError("Billing run failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  async function runReminders() {
    setReminding(true);
    setReminderResult(null);
    try {
      const res = await api.post<ReminderRunResult>("/billing/send-reminders", {}, getAccessToken());
      setReminderResult(res);
      success(
        `${res.emailsSent} reminder${res.emailsSent !== 1 ? "s" : ""} sent`,
        `${res.overdueMark} marked overdue · ${res.errors} errors`
      );
    } catch (err) {
      toastError("Reminder run failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setReminding(false);
    }
  }

  const selectCls = "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div>

      {/* Header — full width, title left */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[var(--ink)]">Recurring Billing</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Invoices are auto-generated on the <strong>1st of each month at 9:00 AM</strong> for all clients
          with active monthly subscriptions. Use the trigger below to run billing manually for any month.
        </p>
      </div>

      {/* Centered content column */}
      <div className="max-w-2xl mx-auto space-y-8">

      {/* Cron schedule info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Invoice generation</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-brand-600">0 9 1 * *</code>
              {" "}— 1st of each month, 9 AM
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              One invoice per client for all active MONTHLY services. Duplicate-safe.
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Payment reminders</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-brand-600">0 8 * * *</code>
              {" "}— daily at 8 AM
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Sends PRE_DUE (3 days), DUE (today), and OVERDUE emails. Marks invoices overdue automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Manual trigger */}
      <div className="card space-y-5">
        <p className="text-sm font-semibold text-[var(--ink)]">Manual trigger</p>
        <p className="text-sm text-[var(--muted)] -mt-3">
          Run billing for a specific month. Safe to run multiple times — clients already billed for the selected month are skipped.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">Year</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <button
            onClick={runBilling}
            disabled={running}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {running ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run for {MONTHS[month - 1]} {year}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-[var(--ink)]">Run result</p>

          <div className="grid grid-cols-3 gap-3">
            <StatChip
              label="Generated"
              value={result.generated}
              color={result.generated > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"}
            />
            <StatChip label="Skipped" value={result.skipped} color="text-[var(--muted)]" />
            <StatChip
              label="Errors"
              value={result.errors}
              color={result.errors > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--muted)]"}
            />
          </div>

          {result.invoices.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <div className="grid min-w-[400px] grid-cols-[1fr_140px_100px] border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
                {["Client", "Invoice #", "Total"].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{h}</span>
                ))}
              </div>
              {result.invoices.map((inv) => (
                <div key={inv.invoiceNumber} className="grid min-w-[400px] grid-cols-[1fr_140px_100px] items-center border-b border-[var(--border)] last:border-0 px-4 py-3">
                  <span className="text-sm text-[var(--ink)]">{inv.clientName}</span>
                  <span className="font-mono text-xs text-brand-600">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-sm font-medium text-[var(--ink)] tabular-nums">
                    {formatCurrency(inv.total)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {result.generated === 0 && result.skipped === 0 && result.errors === 0 && (
            <p className="text-sm text-[var(--muted)]">No active monthly subscriptions found for this period.</p>
          )}
        </div>
      )}

      {/* Reminders trigger */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold text-[var(--ink)]">Send reminders now</p>
        <p className="text-sm text-[var(--muted)] -mt-2">
          Checks all open invoices as of today — sends PRE_DUE, DUE, and OVERDUE emails and marks past-due invoices overdue.
          Already-sent reminders are skipped.
        </p>
        <button
          onClick={runReminders}
          disabled={reminding}
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 px-5 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-60 transition-colors"
        >
          {reminding ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400/40 border-t-amber-600" />
              Sending…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Send reminders
            </>
          )}
        </button>

        {reminderResult && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
            <StatChip label="Emails sent" value={reminderResult.emailsSent} color="text-emerald-600 dark:text-emerald-400" />
            <StatChip label="Marked overdue" value={reminderResult.overdueMark} color="text-amber-600 dark:text-amber-400" />
            <StatChip label="Errors" value={reminderResult.errors} color={reminderResult.errors > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--muted)]"} />
          </div>
        )}
      </div>

      </div> {/* end centered column */}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
