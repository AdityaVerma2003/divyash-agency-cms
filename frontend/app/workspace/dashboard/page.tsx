"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card, CardHeader } from "@/components/portal/Card";
import { StatQuad } from "@/components/portal/StatQuad";
import { EmptyState } from "@/components/portal/EmptyState";
import { PriorityBadge } from "@/components/portal/PriorityBadge";
import { Icon } from "@/components/icons";
import { REPORT_TYPE_LABELS } from "@/lib/reportTypes";
import type { WorkspaceDashboard } from "@/types/workspace";

function formatMonth(ym: string) {
  return new Date(ym + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function WorkspaceDashboardPage() {
  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<WorkspaceDashboard>("/workspace/dashboard", getAccessToken())
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (!data) return <PageLoader fullScreen={false} />;

  const chartData = data.entryVolume.map((d) => ({ ...d, month: formatMonth(d.month) }));
  const hasVolume = data.entryVolume.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      <StatQuad
        items={[
          { label: "Assigned clients", value: String(data.kpis.assignedClients), dotColor: "#6366F1", href: "/workspace/clients" },
          { label: "Entries this month", value: String(data.kpis.entriesThisMonth), dotColor: "#2DBFA0" },
          { label: "Reports still due", value: String(data.kpis.reportsDue), dotColor: "#D97706" },
          { label: "Open tasks", value: String(data.kpis.openTasks), dotColor: "#5B7CF7", href: "/workspace/tasks" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader title="My reporting activity" subtitle="Entries logged per month, last 6 months" />
            {!hasVolume ? (
              <EmptyState
                title="No entries logged yet"
                description="Once you start filing reports for your clients, your monthly volume will show up here."
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Entries" fill="var(--accent-workspace)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="card-header p-5 pb-0">
              <h3 className="card-title">Reports due this month</h3>
            </div>
            {data.reportsDue.length === 0 ? (
              <EmptyState title="No reporting duties assigned yet" description="Once a super admin assigns you clients, they'll show up here." />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.reportsDue.map((row) => (
                  <div key={`${row.clientServiceId}`} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">{row.clientName}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {row.serviceName} · {REPORT_TYPE_LABELS[row.reportType]}
                      </p>
                    </div>
                    {row.hasEntryThisMonth ? (
                      <span className="badge badge-success flex-shrink-0">
                        <Icon name="checkCircle" size={13} /> Logged
                      </span>
                    ) : (
                      <Link
                        href={`/workspace/clients/${row.clientId}`}
                        className="btn btn-primary btn-sm flex-shrink-0"
                      >
                        Add entry
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="card-header p-5 pb-0">
              <h3 className="card-title">Recent entries</h3>
            </div>
            {data.recentEntries.length === 0 ? (
              <EmptyState title="Nothing logged yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEntries.map((e) => (
                      <tr key={e.id}>
                        <td>{formatDate(e.entryDate)}</td>
                        <td>{REPORT_TYPE_LABELS[e.type]}</td>
                        <td className="td-primary">{e.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:self-start">
          <Card>
            <CardHeader title="My open tasks" />
            {data.myTasks.length === 0 ? (
              <EmptyState title="No open tasks" description="Nothing assigned right now." />
            ) : (
              <div className="space-y-3">
                {data.myTasks.map((t) => (
                  <Link
                    key={t.id}
                    href="/workspace/tasks"
                    className="block rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--ink)]">{t.title}</p>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t.client?.companyName ?? "Internal"}
                      {t.dueDate && ` · due ${formatDate(t.dueDate)}`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Upcoming meetings" />
            {data.upcomingEvents.length === 0 ? (
              <EmptyState title="Nothing scheduled" />
            ) : (
              <div className="space-y-3">
                {data.upcomingEvents.map((e) => (
                  <div key={e.id} className="rounded-lg border border-[var(--border)] p-3">
                    <div className="flex items-center gap-2">
                      <Icon name={e.mode === "ONLINE" ? "video" : "mapPin"} size={16} className="text-[var(--muted)]" />
                      <p className="text-sm font-medium text-[var(--ink)]">{e.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {new Date(e.startAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
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
