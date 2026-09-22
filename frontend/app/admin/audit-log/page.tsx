"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { AuditLogPage, AuditLog } from "@/types";

const ENTITY_OPTIONS = [
  "", "Client", "Invoice", "Payment", "ClientService", "User",
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  UPDATE: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAYMENT_RECORDED: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (entityFilter) params.set("entity", entityFilter);
    api
      .get<AuditLogPage>(`/audit-logs?${params}`, getAccessToken())
      .then(setData)
      .catch((err: Error) => toastError("Could not load audit log", err.message));
  }, [page, entityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [entityFilter]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Audit Log</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {data ? `${data.total} event${data.total !== 1 ? "s" : ""} total` : "Loading…"}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-5 flex gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-coral-500 transition-colors"
        >
          <option value="">All entities</option>
          {ENTITY_OPTIONS.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <button onClick={load} className="btn btn-ghost text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      {!data ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : data.logs.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No audit events yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Actions like creating clients, invoices, and payments will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
            {/* Mobile */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {data.logs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBadge action={log.action} />
                      <span className="text-xs font-semibold text-[var(--ink)]">{log.entity}</span>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{log.user?.name ?? "System"} • {log.entityId?.slice(0, 8) ?? "—"}</p>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[140px_120px_130px_180px_1fr_40px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                {["Action", "Entity", "Entity ID", "By", "Timestamp", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {data.logs.map((log: AuditLog) => (
                  <div key={log.id}>
                    <div className="grid grid-cols-[140px_120px_130px_180px_1fr_40px] items-center px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                      <ActionBadge action={log.action} />
                      <span className="text-sm font-medium text-[var(--ink)]">{log.entity}</span>
                      <span className="font-mono text-xs text-[var(--muted)]">{log.entityId?.slice(0, 8) ?? "—"}</span>
                      <span className="text-sm text-[var(--muted)] truncate">{log.user?.name ?? "System"}</span>
                      <span className="text-xs text-[var(--muted)] tabular-nums">{formatDate(log.createdAt)}</span>
                      {log.meta && (
                        <button
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                          aria-label="Toggle meta"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: expanded === log.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {expanded === log.id && log.meta && (
                      <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                        <pre className="text-[11px] text-[var(--muted)] overflow-x-auto">{JSON.stringify(log.meta, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
              <span>Page {data.page} of {data.pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-ghost disabled:opacity-40"
                >← Prev</button>
                <button
                  disabled={data.page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-ghost disabled:opacity-40"
                >Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
