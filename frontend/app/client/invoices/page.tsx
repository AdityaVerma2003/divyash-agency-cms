"use client";

import { useEffect, useState } from "react";
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

/* ── Status badge config ─────────────────────────────────────────────────── */
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

/* ── Sort order for status ───────────────────────────────────────────────── */
const STATUS_ORDER: Record<Invoice["status"], number> = {
  SENT: 0,
  PARTIALLY_PAID: 1,
  OVERDUE: 2,
  DRAFT: 3,
  PAID: 4,
};

type FilterTab = "all" | "unpaid" | "paid";

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const cfg = INV_STATUS[status];
  return (
    <span className={`badge whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
  );
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-28 rounded-md bg-[var(--border)] opacity-60" />
            <div className="h-5 w-16 rounded-full bg-[var(--border)] opacity-40" />
          </div>
          <div className="h-7 w-24 rounded-md bg-[var(--border)] opacity-50 mb-2" />
          <div className="h-3 w-40 rounded-md bg-[var(--border)] opacity-30" />
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ClientInvoicesPage() {
  const { error: toastError } = useToast();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    const token = getAccessToken();
    api
      .get<Invoice[]>("/invoices", token)
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime();
        });
        setInvoices(sorted);
      })
      .catch((err: Error) => {
        toastError("Failed to load invoices", err.message);
        setInvoices([]);
      });
  }, [toastError]);

  const filtered =
    invoices === null
      ? null
      : filter === "unpaid"
      ? invoices.filter((inv) =>
          (["SENT", "PARTIALLY_PAID", "OVERDUE", "DRAFT"] as Invoice["status"][]).includes(
            inv.status
          )
        )
      : filter === "paid"
      ? invoices.filter((inv) => inv.status === "PAID")
      : invoices;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[var(--ink)]">Invoices</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Your billing history</p>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === tab.key
                ? "bg-coral-500 text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {filtered === null && <LoadingSkeleton />}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {filtered !== null && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-20 text-center px-6">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 text-[var(--muted)] opacity-30"
            aria-hidden
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
          </svg>
          <p className="text-base font-bold text-[var(--ink)]">
            {filter === "all"
              ? "No invoices yet"
              : filter === "unpaid"
              ? "No unpaid invoices"
              : "No paid invoices yet"}
          </p>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-xs leading-relaxed">
            {filter === "all"
              ? "No invoices yet — your account manager will send your first one here."
              : "Nothing to show for this filter."}
          </p>
        </div>
      )}

      {/* ── Invoice list ────────────────────────────────────────────────── */}
      {filtered !== null && filtered.length > 0 && (
        <div className="space-y-3">
          {/* Desktop header — hidden on mobile */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_160px_120px_140px_120px_40px] items-center px-5 py-2">
            <span className="section-label">Invoice #</span>
            <span className="section-label">Period</span>
            <span className="section-label text-right">Total</span>
            <span className="section-label">Status</span>
            <span className="section-label">Due</span>
            <span />
          </div>

          {filtered.map((inv) => (
            <Link
              key={inv.id}
              href={`/client/invoices/${inv.id}`}
              className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:-translate-y-0.5 motion-reduce:translate-y-0"
            >
              {/* Mobile layout */}
              <div className="lg:hidden p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                    {inv.invoiceNumber}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="font-display text-xl font-extrabold tabular-nums text-[var(--ink)] mb-2">
                  {formatCurrency(inv.totalAmount)}
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </span>
                  <span>Due {formatDate(inv.dueDate)}</span>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_160px_120px_140px_120px_40px] items-center px-5 py-4">
                <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                  {inv.invoiceNumber}
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </span>
                <span className="text-right font-display text-base font-bold tabular-nums text-[var(--ink)]">
                  {formatCurrency(inv.totalAmount)}
                </span>
                <span>
                  <StatusBadge status={inv.status} />
                </span>
                <span className="text-sm text-[var(--muted)]">{formatDate(inv.dueDate)}</span>
                <span className="flex items-center justify-end text-[var(--muted)]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
