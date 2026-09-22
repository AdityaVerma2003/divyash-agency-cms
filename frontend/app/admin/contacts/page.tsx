"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { ContactRequest } from "@/types";

interface ContactPage {
  requests: ContactRequest[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ServiceSummary({ service }: { service: string }) {
  const parts = service.split(",").map((s) => s.trim()).filter(Boolean);
  const [first, ...rest] = parts;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-sm text-[var(--ink)] truncate">{first}</span>
      {rest.length > 0 && (
        <span className="flex-shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] whitespace-nowrap">
          +{rest.length} more
        </span>
      )}
    </div>
  );
}

export default function AdminContactsPage() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<ContactPage | null>(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<ContactPage>(`/contact?page=${page}&limit=20`, getAccessToken())
      .then(setData)
      .catch((err: Error) => toastError("Could not load contact requests", err.message));
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await api.patch(`/contact/${id}/read`, {}, getAccessToken()).catch(() => undefined);
    setData((prev) => prev ? { ...prev, requests: prev.requests.map((r) => r.id === id ? { ...r, isRead: true } : r) } : prev);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Contact Requests</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {data ? `${data.total} request${data.total !== 1 ? "s" : ""} total` : "Loading…"}
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {!data ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : data.requests.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No contact requests yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Submissions from the website contact form will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
            {/* Mobile cards */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {data.requests.map((r) => (
                <div key={r.id} className={`px-4 py-4 ${!r.isRead ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {!r.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-coral-500" />}
                      <span className="font-semibold text-sm text-[var(--ink)] truncate">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-1">{r.email} · {r.phone}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {r.service.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">{s}</span>
                    ))}
                    {r.service.split(",").length > 3 && (
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">+{r.service.split(",").length - 3} more</span>
                    )}
                  </div>
                  {r.message && (
                    <p className="text-xs text-[var(--muted)] line-clamp-2">{r.message}</p>
                  )}
                  {!r.isRead && (
                    <button onClick={() => markRead(r.id)} className="mt-2 text-xs text-coral-500 hover:text-coral-600 font-medium">Mark read</button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[180px_200px_1fr_100px_90px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                {["Name", "Email", "Services", "Received", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {data.requests.map((r) => (
                  <div key={r.id}>
                    <div
                      className={`grid grid-cols-[180px_200px_1fr_100px_90px] items-center px-5 py-3 hover:bg-[var(--surface-2)] transition-colors cursor-pointer ${!r.isRead ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {!r.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-coral-500" />}
                        <span className="text-sm font-semibold text-[var(--ink)] truncate">{r.name}</span>
                      </div>
                      <span className="text-sm text-[var(--muted)] truncate pr-2">{r.email}</span>
                      <div className="min-w-0 pr-2">
                        <ServiceSummary service={r.service} />
                        {r.company && <span className="text-xs text-[var(--muted)]">{r.company}</span>}
                      </div>
                      <span className="text-xs text-[var(--muted)] tabular-nums">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      <div className="flex items-center justify-end gap-2">
                        {!r.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(r.id); }}
                            className="text-[10px] font-semibold text-coral-500 hover:text-coral-600 whitespace-nowrap"
                          >
                            Mark read
                          </button>
                        )}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--muted)] flex-shrink-0" style={{ transform: expanded === r.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                    {expanded === r.id && (
                      <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 space-y-3">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Phone</span><p className="mt-0.5 text-[var(--ink)]">{r.phone}</p></div>
                          <div><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Email</span><p className="mt-0.5 text-[var(--ink)]">{r.email}</p></div>
                          {r.company && <div><span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Company</span><p className="mt-0.5 text-[var(--ink)]">{r.company}</p></div>}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">All services</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {r.service.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                              <span key={s} className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">{s}</span>
                            ))}
                          </div>
                        </div>
                        {r.message && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Message</span>
                            <p className="mt-0.5 text-sm text-[var(--ink)] whitespace-pre-wrap">{r.message}</p>
                          </div>
                        )}
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
