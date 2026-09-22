"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { AdminNotification, AdminNotificationPage } from "@/types";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "CLIENT_ONBOARDED",  label: "Client onboarded" },
  { value: "WELCOME",           label: "Welcome" },
  { value: "INVOICE_CREATED",   label: "Invoice created" },
  { value: "PAYMENT_RECORDED",  label: "Payment recorded" },
  { value: "CONTACT_REQUEST",   label: "Contact request" },
];

const TYPE_COLORS: Record<string, string> = {
  CLIENT_ONBOARDED:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  WELCOME:           "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  INVOICE_CREATED:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  PAYMENT_RECORDED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  CONTACT_REQUEST:   "bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { error: toastError } = useToast();

  const [data, setData]           = useState<AdminNotificationPage | null>(null);
  const [page, setPage]           = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState<"" | "false" | "true">("");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (typeFilter)  params.set("type",    typeFilter);
    if (readFilter !== "") params.set("isRead", readFilter);
    if (fromDate)    params.set("from",    fromDate);
    if (toDate)      params.set("to",      toDate);
    api
      .get<AdminNotificationPage>(`/notifications/admin?${params}`, getAccessToken())
      .then(setData)
      .catch((err: Error) => toastError("Could not load notifications", err.message));
  }, [page, typeFilter, readFilter, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [typeFilter, readFilter, fromDate, toDate]);

  function handleRowClick(n: AdminNotification) {
    if (n.link) router.push(n.link);
  }

  const hasFilters = typeFilter || readFilter !== "" || fromDate || toDate;

  const selectCls = "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 transition-colors";
  const inputCls  = "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Notifications</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {data ? `${data.total} notification${data.total !== 1 ? "s" : ""} total` : "Loading…"}
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={readFilter} onChange={(e) => setReadFilter(e.target.value as "" | "false" | "true")} className={selectCls}>
          <option value="">All statuses</option>
          <option value="false">Unread only</option>
          <option value="true">Read only</option>
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} title="From date" />
          <span className="text-xs text-[var(--muted)]">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} title="To date" />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setTypeFilter(""); setReadFilter(""); setFromDate(""); setToDate(""); }}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* Table */}
      {!data ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : data.notifications.length === 0 ? (
        <div className="card py-16 text-center">
          {hasFilters ? (
            <>
              <p className="text-sm font-semibold text-[var(--ink)]">Nothing matches these filters</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Try adjusting the type, date range, or read status.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--ink)]">No notifications yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Notifications are created when clients are onboarded, invoices issued, payments recorded, and contact requests submitted.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
            {/* Mobile */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {data.notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleRowClick(n)}
                  className={`px-4 py-4 ${n.link ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""} ${!n.isRead ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-coral-500 mt-0.5" />}
                      <TypeBadge type={n.type} />
                    </div>
                    <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[var(--ink)] leading-snug mb-1">{n.message}</p>
                  <p className="text-xs text-[var(--muted)]">{n.user.name} · {n.user.role.toLowerCase().replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[160px_1fr_180px_120px_80px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                {["Type", "Message", "Recipient", "When", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {data.notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleRowClick(n)}
                    className={`grid grid-cols-[160px_1fr_180px_120px_80px] items-center px-5 py-3.5 transition-colors ${n.link ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""} ${!n.isRead ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-coral-500" />}
                      <TypeBadge type={n.type} />
                    </div>
                    <p className="text-sm text-[var(--ink)] leading-snug truncate pr-4">{n.message}</p>
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--ink)] truncate">{n.user.name}</p>
                      <p className="text-xs text-[var(--muted)]">{n.user.role.toLowerCase().replace(/_/g, " ")}</p>
                    </div>
                    <span className="text-xs text-[var(--muted)] tabular-nums">{formatDate(n.createdAt)}</span>
                    <div className="flex justify-end">
                      {n.link && (
                        <span className="text-xs font-medium text-coral-500">→ view</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
              <span>Page {data.page} of {data.pages} · {data.total} total</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-ghost disabled:opacity-40">← Prev</button>
                <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn btn-ghost disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
