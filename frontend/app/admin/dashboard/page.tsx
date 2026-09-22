"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import type { AdminDashboardSummary, AuthUser, ContactRequest } from "@/types";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function formatToday() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ── Decorative sparkline (illustrative, not data-driven) ────────────────── */
function Sparkline({ color = "#6366F1", id }: { color?: string; id: string }) {
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24" aria-hidden fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="0,30 14,24 28,27 42,18 56,14 70,8 84,5 96,2 96,32 0,32" fill={`url(#${id})`} />
      <polyline points="0,30 14,24 28,27 42,18 56,14 70,8 84,5 96,2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="2" r="2.5" fill={color} />
    </svg>
  );
}

/* ── SVG icons ───────────────────────────────────────────────────────────── */
function IconPeople() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IconReceiptMoney() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/* ── Doodles ─────────────────────────────────────────────────────────────── */
function DoodleBarChartDecor() {
  return (
    <svg width="64" height="64" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="16" width="6" height="12" rx="1.5" />
      <rect x="12" y="9" width="6" height="19" rx="1.5" />
      <rect x="22" y="2" width="6" height="26" rx="1.5" />
      <line x1="0" y1="29" x2="30" y2="29" strokeWidth="1.5" />
    </svg>
  );
}
function DoodleTarget() {
  return (
    <svg width="56" height="56" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="15" cy="15" r="13" />
      <circle cx="15" cy="15" r="8" />
      <circle cx="15" cy="15" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Quick navigate card ─────────────────────────────────────────────────── */
function JumpCard({ href, label, sub, accent }: { href: string; label: string; sub: string; accent: string }) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-coral-500/50 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/25 motion-reduce:translate-y-0 motion-reduce:transition-none">
      <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity" style={{ backgroundColor: accent }} />
      <p className="text-sm font-semibold text-[var(--ink)] mb-0.5">{label}</p>
      <p className="text-xs text-[var(--muted)]">{sub}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-coral-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Open</span><IconArrow />
      </div>
    </Link>
  );
}

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({
  label, value, sub, icon, accentColor, href, borderColor,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accentColor: string;
  href?: string; borderColor: string;
}) {
  const inner = (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all ${
      href ? "hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 motion-reduce:translate-y-0" : ""
    }`}
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label mb-2">{label}</p>
          <p className="font-display text-2xl font-bold tabular-nums text-[var(--ink)] leading-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>}
        </div>
        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: accentColor + "18", color: accentColor }}>
          {icon}
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

/* ── Revenue card ────────────────────────────────────────────────────────── */
function RevenueCard({ label, value, sparkId, color, note }: {
  label: string; value: string; sparkId: string; color: string; note?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      {/* Doodle bg accent */}
      <div className="pointer-events-none absolute right-4 bottom-4 opacity-[0.04] text-[var(--ink)]">
        <DoodleBarChartDecor />
      </div>
      <p className="section-label mb-3">{label}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums text-[var(--ink)] leading-none mb-3">{value}</p>
      <div className="flex items-end justify-between gap-2">
        {note && <p className="text-xs text-[var(--muted)]">{note}</p>}
        <Sparkline color={color} id={sparkId} />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactRequest[]>([]);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
    api.get<AdminDashboardSummary>("/dashboard/admin", getAccessToken())
      .then(setSummary)
      .catch((err) => setError(err.message));
    api.get<{ requests: ContactRequest[] }>("/contact?limit=5", getAccessToken())
      .then((d) => setContacts(d.requests))
      .catch(() => undefined);
  }, []);

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
      {error}
    </div>
  );

  if (!summary) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-16 rounded-xl bg-[var(--border)] opacity-50" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 rounded-xl bg-[var(--border)] opacity-40" />
          <div className="h-28 rounded-xl bg-[var(--border)] opacity-40" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-[var(--border)] opacity-30" />)}
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Welcome bar ────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)]">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{formatToday()}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/invoices/new" className="btn btn-primary">
            <IconPlus /> New invoice
          </Link>
          <Link href="/admin/clients" className="btn btn-ghost">
            <IconPlus /> Add client
          </Link>
        </div>
      </div>

      {/* ── Revenue cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RevenueCard
          label="Monthly recurring revenue"
          value={formatCurrency(summary.monthlyRecurringRevenue)}
          sparkId="spark-mrr"
          color="#6366F1"
          note="Active subscriptions billed monthly"
        />
        <RevenueCard
          label="Revenue this month"
          value={formatCurrency(summary.revenueThisMonth)}
          sparkId="spark-month"
          color="#2DBFA0"
          note="Payments received so far"
        />
      </div>

      {/* ── Overdue alert ──────────────────────────────── */}
      {summary.overdueInvoiceCount > 0 && (
        <Link href="/admin/invoices?status=OVERDUE"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/15 px-5 py-3.5 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/25 motion-reduce:transition-none">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 text-amber-600 dark:text-amber-400"><IconAlert /></div>
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {summary.overdueInvoiceCount} invoice{summary.overdueInvoiceCount > 1 ? "s" : ""} overdue — action required
            </span>
          </div>
          <span className="flex-shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            View overdue <IconArrow />
          </span>
        </Link>
      )}

      {/* ── KPI cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active clients"
          value={String(summary.totalClients)}
          sub="on platform"
          icon={<IconPeople />}
          accentColor="#5B7CF7"
          borderColor="#5B7CF7"
        />
        <MetricCard
          label="Active subscriptions"
          value={String(summary.activeSubscriptions)}
          sub="running services"
          icon={<IconRepeat />}
          accentColor="#2DBFA0"
          borderColor="#2DBFA0"
        />
        <MetricCard
          label="Outstanding balance"
          value={formatCurrency(summary.outstandingAmount)}
          sub="pending collection"
          icon={<IconReceiptMoney />}
          accentColor="#6366F1"
          borderColor="#6366F1"
          href="/admin/invoices?status=outstanding"
        />
      </div>

      {/* ── Lifecycle alerts row ────────────────────────── */}
      {(summary.suspendedClients > 0 || summary.contractsEndingSoon.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {summary.suspendedClients > 0 && (
            <Link href="/admin/clients"
              className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-800/40 dark:bg-orange-900/15 px-4 py-3.5 hover:bg-orange-100 dark:hover:bg-orange-900/25 transition-colors">
              <div className="mt-0.5 flex-shrink-0 text-orange-600 dark:text-orange-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  {summary.suspendedClients} suspended account{summary.suspendedClients > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                  Review and reactivate when payment is received
                </p>
              </div>
            </Link>
          )}

          {summary.contractsEndingSoon.length > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-800/40 dark:bg-brand-900/15 px-4 py-3.5">
              <p className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-2">
                {summary.contractsEndingSoon.length} contract{summary.contractsEndingSoon.length > 1 ? "s" : ""} ending within 14 days
              </p>
              <ul className="space-y-1">
                {summary.contractsEndingSoon.slice(0, 3).map((cs) => (
                  <li key={cs.id}>
                    <Link href={`/admin/clients/${cs.clientId}`} className="text-xs text-brand-700 dark:text-brand-400 hover:underline">
                      {cs.clientName} — {cs.serviceName}{" "}
                      <span className="text-brand-500">
                        ({new Date(cs.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                      </span>
                    </Link>
                  </li>
                ))}
                {summary.contractsEndingSoon.length > 3 && (
                  <li className="text-xs text-[var(--muted)]">+{summary.contractsEndingSoon.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Quick navigate ─────────────────────────────── */}
      <div>
        <p className="section-label mb-3">Quick navigate</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <JumpCard href="/admin/invoices" label="Invoices" sub="View, create & manage all invoices" accent="#6366F1" />
          <JumpCard href="/admin/clients"  label="Clients"  sub="Manage client accounts & services" accent="#5B7CF7" />
          <JumpCard href="/admin/services" label="Services" sub="Configure agency service offerings" accent="#2DBFA0" />
        </div>
      </div>

      {/* ── Recent contact requests ────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Recent contact requests</p>
          <Link href="/admin/contacts" className="text-xs font-semibold text-coral-500 hover:text-coral-600 transition-colors">
            View all →
          </Link>
        </div>
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--muted)]">No contact requests yet. They'll appear here when visitors submit the website form.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
            <div className="divide-y divide-[var(--border)]">
              {contacts.map((r) => (
                <Link key={r.id} href="/admin/contacts" className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors ${!r.isRead ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}>
                  <div className="flex-shrink-0">
                    {!r.isRead ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-100 dark:bg-coral-900/30">
                        <span className="h-2 w-2 rounded-full bg-coral-500" />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{r.name}{r.company ? ` · ${r.company}` : ""}</p>
                    <p className="text-xs text-[var(--muted)] truncate">{r.service} · {r.email}</p>
                  </div>
                  <p className="flex-shrink-0 text-[10px] text-[var(--muted)] tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Visual insight strip ───────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
        {/* Background doodle */}
        <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-coral-500 opacity-[0.05]">
          <DoodleTarget />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Utilisation rate", value: summary.totalClients > 0 ? `${Math.round((summary.activeSubscriptions / summary.totalClients) * 10) / 10}×` : "—", note: "subs per client" },
            { label: "Avg. client value", value: summary.totalClients > 0 ? formatCurrency(Math.round(summary.monthlyRecurringRevenue / summary.totalClients)) : "—", note: "MRR per client" },
            { label: "Collection health", value: summary.overdueInvoiceCount === 0 ? "✓ Clean" : `${summary.overdueInvoiceCount} overdue`, note: summary.overdueInvoiceCount === 0 ? "no overdues" : "needs action" },
            { label: "Billed vs collected", value: summary.revenueThisMonth > 0 && summary.monthlyRecurringRevenue > 0 ? `${Math.round((summary.revenueThisMonth / summary.monthlyRecurringRevenue) * 100)}%` : "—", note: "of MRR collected" },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="section-label mb-1.5">{item.label}</p>
              <p className="font-display text-xl font-bold text-[var(--ink)] tabular-nums leading-tight">{item.value}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
