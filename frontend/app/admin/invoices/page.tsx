"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { Invoice } from "@/types";

type StatusFilter =
  | ""
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "outstanding";

const STATUS_LABELS: Record<StatusFilter, string> = {
  "": "All statuses",
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  outstanding: "Outstanding",
};

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  DRAFT:          { dot: "bg-[var(--muted)]",   bg: "bg-[var(--surface-2)]",                                      text: "text-[var(--muted)]",                                              label: "Draft" },
  SENT:           { dot: "bg-coral-500",         bg: "bg-coral-50 dark:bg-coral-900/20",                           text: "text-coral-600 dark:text-coral-400",                                label: "Sent" },
  PARTIALLY_PAID: { dot: "bg-amber-500",         bg: "bg-amber-50 dark:bg-amber-900/20",                           text: "text-amber-700 dark:text-amber-400",                                label: "Partial" },
  PAID:           { dot: "bg-emerald-500",       bg: "bg-emerald-50 dark:bg-emerald-900/20",                       text: "text-emerald-700 dark:text-emerald-400",                            label: "Paid" },
  OVERDUE:        { dot: "bg-red-500",           bg: "bg-red-50 dark:bg-red-900/20",                               text: "text-red-700 dark:text-red-400",                                    label: "Overdue" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
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

function isOverdue(dueDate: string, status: string) {
  return status !== "PAID" && new Date(dueDate) < new Date();
}

function matchesStatusFilter(invoice: Invoice, filter: StatusFilter): boolean {
  if (filter === "") return true;
  if (filter === "outstanding") return ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status);
  return invoice.status === filter;
}

const AVATAR_COLORS = ["#6366F1", "#2DBFA0", "#5B7CF7", "#F87DA3", "#D97706", "#7C3AED", "#0891B2"];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function InvoicesInner() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") ?? "") as StatusFilter;
  const { error: toastError } = useToast();

  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  useEffect(() => {
    api
      .get<Invoice[]>("/invoices", getAccessToken())
      .then(setInvoices)
      .catch((err: Error) => toastError("Could not load invoices", err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = invoices
    ? invoices.filter(
        (inv) =>
          matchesStatusFilter(inv, statusFilter) &&
          (inv.client?.companyName ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {invoices ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} total` : "Loading…"}
          </p>
        </div>
        <Link href="/admin/invoices/new" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search by client name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-coral-500 transition-colors"
        >
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {!invoices ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No invoices yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Create the first invoice to get started.</p>
          <Link href="/admin/invoices/new" className="btn btn-primary mt-4 inline-flex">+ New invoice</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
          {filtered && filtered.length > 0 ? (<>
            {/* ── Mobile card list (< md) ── */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filtered.map((inv) => {
                const overdue = isOverdue(inv.dueDate, inv.status);
                const clientName = inv.client?.companyName ?? "—";
                return (
                  <div key={inv.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Link href={`/admin/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-[var(--ink)] hover:text-coral-500 transition-colors">
                        {inv.invoiceNumber}
                      </Link>
                      <StatusPill status={inv.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-5 flex-shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: avatarColor(clientName) }}>
                        {clientName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs text-[var(--muted)] truncate">{clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(inv.totalAmount)}</span>
                        <span className={`${overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-[var(--muted)]"}`}>
                          Due {formatDate(inv.dueDate)}{overdue ? " · Overdue" : ""}
                        </span>
                      </div>
                      <Link href={`/admin/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all">
                        View
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop grid table (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto">
              <div className="grid grid-cols-[2fr_1.5fr_130px_120px_130px_90px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                {["Invoice #", "Client", "Total", "Status", "Due date", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((inv) => {
                  const overdue = isOverdue(inv.dueDate, inv.status);
                  const clientName = inv.client?.companyName ?? "—";
                  return (
                    <div key={inv.id} className="group grid grid-cols-[2fr_1.5fr_130px_120px_130px_90px] items-center px-5 py-4 transition-colors hover:bg-[var(--surface-2)]">
                      <div>
                        <Link href={`/admin/invoices/${inv.id}`} className="font-semibold text-[var(--ink)] hover:text-coral-500 transition-colors font-mono text-sm">
                          {inv.invoiceNumber}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 flex-shrink-0 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: avatarColor(clientName) }} aria-hidden>
                          {clientName.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate text-sm text-[var(--muted)]">{clientName}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">{formatCurrency(inv.totalAmount)}</span>
                      <StatusPill status={inv.status} />
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-sm tabular-nums whitespace-nowrap ${overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-[var(--muted)]"}`}>
                          {formatDate(inv.dueDate)}
                        </span>
                        {overdue && <span className="w-fit text-[10px] font-bold uppercase tracking-wide text-red-500">Overdue</span>}
                      </div>
                      <div className="flex justify-end">
                        <Link href={`/admin/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-all hover:border-coral-500 hover:text-coral-500 hover:bg-coral-500/5">
                          View
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>) : (
            <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
              No invoices match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
      </div>
    }>
      <InvoicesInner />
    </Suspense>
  );
}
