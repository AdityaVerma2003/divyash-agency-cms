"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card, CardHeader } from "@/components/portal/Card";
import { StatQuad, type StatQuadItem } from "@/components/portal/StatQuad";
import { PeriodSelect, PERIOD_OPTIONS, type DashboardPeriod } from "@/components/portal/PeriodSelect";
import { SegmentedControl } from "@/components/portal/SegmentedControl";
import { AvatarStack } from "@/components/portal/Avatar";
import { EmptyState } from "@/components/portal/EmptyState";
import { Icon } from "@/components/icons";
import type { AdminDashboardSummary, ContactRequest } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
function formatMonth(ym: string) {
  return new Date(ym + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("this_month");
  const [range, setRange] = useState<"3" | "6" | "12">("6");

  useEffect(() => {
    api
      .get<AdminDashboardSummary>(`/dashboard/admin?period=${period}&range=${range}`, getAccessToken())
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [period, range]);

  useEffect(() => {
    api.get<{ requests: ContactRequest[] }>("/contact?limit=5", getAccessToken())
      .then((d) => setContacts(d.requests))
      .catch(() => undefined);
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (!summary) return <PageLoader fullScreen={false} />;

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "This month";

  const kpis: StatQuadItem[] = [
    { label: "Revenue", value: formatCurrency(summary.kpis.revenue.value), dotColor: "#6366F1", deltaPct: summary.kpis.revenue.deltaPct, href: "/admin/invoices" },
    { label: "Contracts Signed", value: String(summary.kpis.contractsSigned.value), dotColor: "#2DBFA0", deltaPct: summary.kpis.contractsSigned.deltaPct },
    { label: "Clients Added", value: String(summary.kpis.clientsAdded.value), dotColor: "#F59E0B", deltaPct: summary.kpis.clientsAdded.deltaPct, href: "/admin/clients" },
    { label: "Invoices Sent", value: String(summary.kpis.invoicesSent.value), dotColor: "#A855F7", deltaPct: summary.kpis.invoicesSent.deltaPct, href: "/admin/invoices" },
  ];

  const chartData = summary.leadTrend.map((d) => ({ ...d, month: formatMonth(d.month) }));
  const hasLeadData = summary.leadTrend.some((d) => d.leads > 0 || d.converted > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <StatQuad items={kpis} />

      {summary.overdueInvoiceCount > 0 && (
        <Link
          href="/admin/invoices?status=OVERDUE"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/15 dark:hover:bg-amber-900/25"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="alert" size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {summary.overdueInvoiceCount} invoice{summary.overdueInvoiceCount > 1 ? "s" : ""} overdue — action required
            </span>
          </div>
          <span className="flex-shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400">View overdue →</span>
        </Link>
      )}

      {summary.contractsEndingSoon.length > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5 dark:border-brand-800/40 dark:bg-brand-900/15">
          <p className="mb-2 text-sm font-semibold text-brand-800 dark:text-brand-300">
            {summary.contractsEndingSoon.length} contract{summary.contractsEndingSoon.length > 1 ? "s" : ""} ending within 14 days
          </p>
          <ul className="space-y-1">
            {summary.contractsEndingSoon.slice(0, 3).map((cs) => (
              <li key={cs.id}>
                <Link href={`/admin/clients/${cs.clientId}`} className="text-xs text-brand-700 hover:underline dark:text-brand-400">
                  {cs.clientName} — {cs.serviceName}{" "}
                  <span className="text-brand-500">({formatDate(cs.endDate)})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Lead growth & Conversion"
              subtitle={`${periodLabel} · monthly totals from Paid Ads reporting`}
              action={
                <SegmentedControl
                  value={range}
                  onChange={setRange}
                  options={[{ value: "3", label: "3M" }, { value: "6", label: "6M" }, { value: "12", label: "12M" }]}
                />
              }
            />
            {!hasLeadData ? (
              <EmptyState
                title="No lead data yet"
                description="Once your team logs Paid Ads entries, leads and conversions will chart here."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2DBFA0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2DBFA0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366F1" fill="url(#leadsGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="converted" name="Converted" stroke="#2DBFA0" fill="url(#convGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="card-header p-5 pb-0">
              <h3 className="card-title">Recent contact requests</h3>
              <Link href="/admin/contacts" className="text-xs font-semibold text-[var(--portal-accent,var(--brand))]">View all →</Link>
            </div>
            {contacts.length === 0 ? (
              <EmptyState title="No contact requests yet" description="They'll appear here when visitors submit the website form." />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {contacts.map((r) => (
                  <Link key={r.id} href="/admin/contacts" className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--surface-2)]">
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${!r.isRead ? "bg-brand-100 dark:bg-brand-900/30" : "bg-[var(--surface-2)]"}`}>
                      <span className={`h-2 w-2 rounded-full ${!r.isRead ? "bg-brand-500" : "bg-transparent"}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">{r.name}{r.company ? ` · ${r.company}` : ""}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{r.service} · {r.email}</p>
                    </div>
                    <p className="flex-shrink-0 text-[11px] tabular-nums text-[var(--muted)]">{formatDate(r.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="At a glance" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Utilisation rate", value: summary.totalClients > 0 ? `${Math.round((summary.activeSubscriptions / summary.totalClients) * 10) / 10}×` : "—", note: "subs per client" },
                { label: "Avg. client value", value: summary.totalClients > 0 ? formatCurrency(Math.round(summary.monthlyRecurringRevenue / summary.totalClients)) : "—", note: "MRR per client" },
                { label: "Collection health", value: summary.overdueInvoiceCount === 0 ? "Clean" : `${summary.overdueInvoiceCount} overdue`, note: summary.overdueInvoiceCount === 0 ? "no overdues" : "needs action" },
                { label: "Billed vs collected", value: summary.revenueThisMonth > 0 && summary.monthlyRecurringRevenue > 0 ? `${Math.round((summary.revenueThisMonth / summary.monthlyRecurringRevenue) * 100)}%` : "—", note: "of MRR collected" },
              ].map((item) => (
                <div key={item.label} className="min-w-0">
                  <p className="stat-label mb-1.5">{item.label}</p>
                  <p className="font-portal text-xl font-bold leading-tight tabular-nums text-[var(--ink)]">{item.value}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{item.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:self-start">
          <Card>
            <CardHeader title="Upcoming Tasks & Meetings" />
            {summary.upcoming.events.length === 0 && summary.upcoming.tasks.length === 0 ? (
              <EmptyState title="Nothing scheduled" />
            ) : (
              <div className="space-y-3">
                {summary.upcoming.events.map((e) => (
                  <div key={`e-${e.id}`} className="rounded-lg border border-[var(--border)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name={e.mode === "ONLINE" ? "video" : "mapPin"} size={15} className="flex-shrink-0 text-[var(--muted)]" />
                        <p className="truncate text-sm font-medium text-[var(--ink)]">{e.title}</p>
                      </div>
                      <span className="badge badge-brand flex-shrink-0">Meeting</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(e.startAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <AvatarStack people={e.attendees.map((a) => ({ name: a.name, photoUrl: a.photoUrl }))} />
                    </div>
                  </div>
                ))}
                {summary.upcoming.tasks.map((t) => (
                  <Link key={`t-${t.id}`} href="/admin/tasks" className="block rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-2)]">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{t.title}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-xs text-[var(--muted)]">
                        {t.client?.companyName ?? "Internal"}{t.dueDate && ` · due ${formatDate(t.dueDate)}`}
                      </p>
                      <AvatarStack people={t.assignees.map((a) => ({ name: a.name, photoUrl: a.photoUrl }))} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent Activities" />
            {summary.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <div className="space-y-3">
                {summary.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold uppercase text-[var(--ink-2)]">
                      {a.actor?.name.slice(0, 2) ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--ink)]">
                        <span className="font-medium">{a.actor?.name ?? "Someone"}</span>{" "}
                        {a.kind === "comment" ? "commented on" : a.action.toLowerCase()}{" "}
                        <span className="font-medium">{a.subject}</span>
                      </p>
                      {a.body && (
                        <p className="mt-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--ink-2)]">{a.body}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
