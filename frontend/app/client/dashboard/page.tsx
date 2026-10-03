"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { fetchCurrentUser, getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { reportTypeForCategory } from "@/lib/reportTypes";
import { StatQuad } from "@/components/portal/StatQuad";
import { EmptyState } from "@/components/portal/EmptyState";
import type { ClientDashboardSummary, AuthUser, PerServiceMetric, Client } from "@/types";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatMonth(ym: string) {
  const d = new Date(ym + "-01");
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ── Category config ─────────────────────────────────────────────────────── */
type ServiceCategory =
  | "SEO"
  | "SMM"
  | "GOOGLE_ADS"
  | "META_ADS"
  | "WEB_DESIGN"
  | "GRAPHIC_DESIGN"
  | "CONTENT";

const CAT: Record<
  ServiceCategory,
  { label: string; color: string; dot: string; iconBg: string; chartColor: string }
> = {
  SEO: {
    label: "SEO",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "#059669",
    iconBg: "#059669",
    chartColor: "#059669",
  },
  SMM: {
    label: "Social Media",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    dot: "#0284C7",
    iconBg: "#0284C7",
    chartColor: "#0284C7",
  },
  GOOGLE_ADS: {
    label: "Google Ads",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "#D97706",
    iconBg: "#D97706",
    chartColor: "#D97706",
  },
  META_ADS: {
    label: "Meta Ads",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "#7C3AED",
    iconBg: "#7C3AED",
    chartColor: "#7C3AED",
  },
  WEB_DESIGN: {
    label: "Web Design",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    dot: "#0891B2",
    iconBg: "#0891B2",
    chartColor: "#0891B2",
  },
  GRAPHIC_DESIGN: {
    label: "Graphic Design",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    dot: "#DB2777",
    iconBg: "#DB2777",
    chartColor: "#DB2777",
  },
  CONTENT: {
    label: "Content",
    color: "bg-[var(--surface-2)] text-[var(--muted)]",
    dot: "#6B7280",
    iconBg: "#6B7280",
    chartColor: "#6B7280",
  },
};

const INV_STATUS: Record<string, { cls: string; label: string }> = {
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

const PLATFORM_BADGE: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  FACEBOOK: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  YOUTUBE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TWITTER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  LINKEDIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

/* ── Category badge ──────────────────────────────────────────────────────── */
function CategoryBadge({ category }: { category: string }) {
  const cfg = CAT[category as ServiceCategory];
  if (!cfg) return <span className="badge bg-[var(--surface-2)] text-[var(--muted)]">{category}</span>;
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}

/* ── Platform badge ──────────────────────────────────────────────────────── */
function PlatformBadge({ platform }: { platform: string }) {
  const cls =
    PLATFORM_BADGE[platform.toUpperCase()] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  const labels: Record<string, string> = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    YOUTUBE: "YouTube",
    TWITTER: "X/Twitter",
    LINKEDIN: "LinkedIn",
  };
  return (
    <span className={`badge w-fit whitespace-nowrap ${cls}`}>
      {labels[platform.toUpperCase()] ?? platform}
    </span>
  );
}

/* ── Service icon ────────────────────────────────────────────────────────── */
function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    SEO: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="6" />
        <path d="M15.5 15.5L20 20" strokeWidth="2" />
        <path d="M10 7v6M7 10h6" strokeWidth="1.5" />
      </svg>
    ),
    SMM: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
      </svg>
    ),
    GOOGLE_ADS: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    META_ADS: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
    ),
    WEB_DESIGN: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="15" rx="2" />
        <path d="M2 7h20M8 21h8M12 18v3" />
      </svg>
    ),
    GRAPHIC_DESIGN: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    CONTENT: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  };
  const cfg = CAT[category as ServiceCategory];
  const icon = icons[category] ?? icons.CONTENT;
  const bg = cfg?.iconBg ?? "#6B7280";
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
      style={{ backgroundColor: bg }}
    >
      {icon}
    </div>
  );
}

/* ── Metric tile ─────────────────────────────────────────────────────────── */
function MetricTile({
  value,
  label,
  sub,
  accent,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p
        className="font-display text-xl font-extrabold tabular-nums leading-none text-[var(--ink)]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      {sub && <p className="text-[11px] text-[var(--muted)] opacity-70">{sub}</p>}
    </div>
  );
}

/* ── Mini monthly trend chart embedded in a service card ─────────────────── */
function monthlySeriesFor(metric: PerServiceMetric): { data: Record<string, number>; label: string } | null {
  if ("reachByMonth" in metric) return { data: metric.reachByMonth, label: "Profile reach" };
  if ("leadsByMonth" in metric) return { data: metric.leadsByMonth, label: "Leads" };
  if ("trafficByMonth" in metric) return { data: metric.trafficByMonth, label: "Traffic gain" };
  if ("itemsByMonth" in metric) return { data: metric.itemsByMonth, label: "Items delivered" };
  return null;
}

function MiniTrendChart({ data, color }: { data: Record<string, number>; color: string }) {
  // `data` is sparse (only months with an entry), so zero-fill a real 6-month
  // window ending this month — otherwise a single data point renders as one
  // bar stretched across the whole chart, looking like a solid block.
  const now = new Date();
  const chartData: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    chartData.push({ month: formatMonth(key), value: data[key] ?? 0 });
  }
  const hasData = chartData.some((d) => d.value > 0);
  if (!hasData) return null;

  return (
    <div className="mt-3 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Card shell: links through to the detail page when one exists ───────── */
function CardShell({ href, className, children }: { href: string | null; className: string; children: React.ReactNode }) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

/* ── Per-service performance card ────────────────────────────────────────── */
function ServicePerfCard({ metric }: { metric: PerServiceMetric }) {
  const cfg = CAT[metric.category as ServiceCategory];
  const dot = cfg?.dot ?? "#6B7280";
  const iconBg = cfg?.iconBg ?? "#6B7280";
  const reportType = reportTypeForCategory(metric.category);
  const trend = monthlySeriesFor(metric);

  return (
    <CardShell
      href={reportType ? `/client/reporting/${metric.clientServiceId}` : null}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:shadow-portal-sm motion-reduce:translate-y-0"
    >
      {reportType && (
        <span className="absolute right-4 top-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100">
          View details →
        </span>
      )}
      {/* Accent bar on hover */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: dot }}
      />

      <div className="flex items-start gap-3 mb-4">
        <CategoryIcon category={metric.category} />
        <div className="min-w-0 flex-1">
          <CategoryBadge category={metric.category} />
          <p className="mt-1.5 font-display text-base font-bold text-[var(--ink)] leading-tight">
            {metric.serviceName}
          </p>
        </div>
        <span className="badge badge-success flex-shrink-0">Active</span>
      </div>

      {/* Metrics grid */}
      {"totalPosts" in metric ? (
        // SMM
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile value={String(metric.totalPosts)} label="Posts" accent={iconBg} />
          <MetricTile value={formatNumber(metric.totalProfileReach)} label="Profile reach" />
          <MetricTile value={String(metric.totalLeads)} label="Leads" sub="from paid ads" />
        </div>
      ) : "totalAdSpend" in metric ? (
        // GOOGLE_ADS / META_ADS / PERFORMANCE_MARKETING
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile value={formatCurrency(metric.totalAdSpend)} label="Ad spend" accent={iconBg} />
          <MetricTile value={String(metric.totalConversion)} label="Conversions" />
          <MetricTile value={`${metric.roasPct.toFixed(1)}%`} label="Avg ROAS" />
        </div>
      ) : "totalLinksSubmission" in metric ? (
        // SEO
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile value={String(metric.totalLinksSubmission)} label="Links submitted" accent={iconBg} />
          <MetricTile value={formatNumber(metric.trafficGain)} label="Traffic gain" />
          <MetricTile value={String(metric.totalArticleCreated)} label="Articles" />
        </div>
      ) : "totalItems" in metric ? (
        // Graphic Design / Content Creation
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile value={String(metric.totalItems)} label="Items delivered" accent={iconBg} />
          <MetricTile
            value={metric.latestSubmissionDate ? formatDate(metric.latestSubmissionDate) : "—"}
            label="Last submission"
          />
        </div>
      ) : "websiteLink" in metric ? (
        // Website Development — detail card, not a metric grid
        <div className="space-y-1.5 rounded-xl bg-[var(--surface-2)] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Website</span>
            {metric.websiteLink ? (
              <a href={metric.websiteLink} target="_blank" rel="noreferrer" className="font-semibold text-coral-600 hover:underline truncate max-w-[160px]">
                {metric.websiteLink}
              </a>
            ) : (
              <span className="font-semibold text-[var(--ink)]">Not set yet</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Hosting</span>
            <span className="font-semibold text-[var(--ink)]">{metric.hosting === "DD_SHARED" ? "Divyash shared" : metric.hosting === "CLIENT_OWN" ? "Client-owned" : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">SEO enhanced</span>
            <span className="font-semibold text-[var(--ink)]">{metric.seoEnhanced ? "Yes" : "No"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Maintenance</span>
            <span className="font-semibold text-[var(--ink)]">{metric.maintenanceAgreed ? "Agreed" : "—"}</span>
          </div>
        </div>
      ) : (
        // Other — no detailed metrics yet
        <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">
            Detailed performance reporting is not available for this service type yet.
          </p>
        </div>
      )}

      {trend && <MiniTrendChart data={trend.data} color={iconBg} />}
    </CardShell>
  );
}

/* ── Custom Recharts tooltip ─────────────────────────────────────────────── */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--ink)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{formatter ? formatter(p.value) : p.value.toLocaleString("en-IN")}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Reach over time chart ───────────────────────────────────────────────── */
function ReachChart({ data }: { data: { month: string; totalReach: number }[] }) {
  const hasData = data.some((d) => d.totalReach > 0);
  const chartData = data.map((d) => ({ ...d, month: formatMonth(d.month) }));

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-5">
        <div className="mb-4">
          <p className="section-label">Reach over time</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Monthly organic reach across all social posts</p>
        </div>

        {!hasData ? (
          <EmptyState
            title="No reach data yet"
            description="Posts published by your team will appear here once data is logged."
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatNumber(v)}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
              />
              <Area
                type="monotone"
                dataKey="totalReach"
                name="Reach"
                stroke="#0284C7"
                strokeWidth={2}
                fill="url(#reachGrad)"
                dot={{ fill: "#0284C7", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#0284C7" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ── Leads over time chart ───────────────────────────────────────────────── */
function LeadsChart({ data }: { data: { month: string; count: number; revenueAttributed: number }[] }) {
  const hasData = data.some((d) => d.count > 0);
  const chartData = data.map((d) => ({ ...d, month: formatMonth(d.month) }));

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-5">
        <div className="mb-4">
          <p className="section-label">Lead pipeline</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Monthly new leads and attributed revenue</p>
        </div>

        {!hasData ? (
          <EmptyState
            title="No leads logged yet"
            description="Your account manager will log leads as they come in from your campaigns."
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(v) => v.toLocaleString("en-IN")}
                  />
                }
              />
              <Bar dataKey="count" name="Leads" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ── Recent posts with pagination ────────────────────────────────────────── */
const POSTS_PAGE_SIZE = 8;

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<ClientDashboardSummary | null>(null);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownPosts, setShownPosts] = useState(POSTS_PAGE_SIZE);
  const [downloadingReport, setDownloadingReport] = useState(false);

  async function downloadReport() {
    if (!user?.clientId) return;
    setDownloadingReport(true);
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`${apiUrl}/reports/${user.clientId}/pdf?month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report_${month}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report download failed:", err);
    } finally {
      setDownloadingReport(false);
    }
  }

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      if (!u?.clientId) return;
      const token = getAccessToken();
      Promise.all([
        api.get<ClientDashboardSummary>(`/dashboard/client/${u.clientId}`, token),
        api.get<Client>(`/clients/${u.clientId}`, token),
      ])
        .then(([sum, cl]) => { setSummary(sum); setClientInfo(cl); })
        .catch((err: Error) => setError(err.message));
    });
  }, []);

  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
        {error}
      </div>
    );

  if (!summary) {
    return <PageLoader fullScreen={false} />;
  }

  const isSuspended = clientInfo?.status === "SUSPENDED";

  const invoice = summary.upcomingInvoice;
  const invStatus = invoice ? INV_STATUS[invoice.status] : null;
  const dueIn = invoice ? daysUntil(invoice.dueDate) : null;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // A metric "has performance data" once the backend attached a real
  // summarize* result (any of the type-discriminating fields below), rather
  // than falling back to the bare clientServiceId/serviceName/category shape.
  const hasPerformance = summary.perService.some(
    (m) =>
      "totalPosts" in m ||
      "totalAdSpend" in m ||
      "totalLinksSubmission" in m ||
      "totalItems" in m ||
      "websiteLink" in m
  );

  // Aggregate totals for snapshot strip
  const totalReachAll = summary.reachTrend.reduce((s, d) => s + d.totalReach, 0);
  const totalLeadsAll = summary.leadsTrend.reduce((s, d) => s + d.count, 0);

  const visiblePosts = summary.recentPosts.slice(0, shownPosts);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Suspension banner ─────────────────────────── */}
      {isSuspended && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-5 py-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Your account is currently on hold</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Please clear any outstanding invoices to restore full access. You can view and pay your invoices below.
              For assistance, contact us at <a href="mailto:support@divyashdigital.com" className="underline">support@divyashdigital.com</a>.
            </p>
          </div>
        </div>
      )}

      {/* ── Title row ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          {summary.activeServices.length > 0
            ? `${summary.activeServices.length} active service${summary.activeServices.length > 1 ? "s" : ""} running — here's what they're delivering.`
            : "No active services yet — get in touch to get started."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadReport} disabled={downloadingReport} className="btn btn-ghost disabled:opacity-60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloadingReport ? "Generating…" : "Monthly report"}
          </button>
          <a href="mailto:info@divyashdigital.co.in" className="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact us
          </a>
        </div>
      </div>

      {/* ── Suspended clients: show invoices CTA, hide all performance ──── */}
      {isSuspended && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--ink)]">Performance data is hidden while your account is on hold</p>
          <p className="text-xs text-[var(--muted)]">Pay your outstanding invoices to restore full access to performance reports, campaign data, and more.</p>
          <Link href="/client/invoices" className="inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
            View &amp; pay invoices →
          </Link>
        </div>
      )}

      {/* ── KPI quad ──────────────────────────────────── */}
      {!isSuspended && (
        <StatQuad
          items={[
            { label: "Total reach (6 mo)", value: formatNumber(totalReachAll), dotColor: "#2DBFA0" },
            { label: "Leads (6 mo)", value: String(totalLeadsAll), dotColor: "#5B7CF7" },
            { label: "Total invested", value: formatCurrency(summary.totalSpendAmount), dotColor: "#6366F1" },
            { label: "Active services", value: String(summary.activeServices.length), dotColor: "#F59E0B" },
          ]}
        />
      )}

      {/* ── Main layout (hidden for suspended accounts) ── */}
      {!isSuspended && <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">

        {/* ── Left column ──────────────────────────────── */}
        <div className="space-y-8 min-w-0">

          {/* ── Performance by service ─── THE VISUAL FOCUS ── */}
          {hasPerformance ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <p className="section-label">Performance by service</p>
                <span className="badge bg-[var(--surface-2)] text-[var(--muted)] text-[10px]">
                  last 3 months
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {summary.perService.map((m) => (
                  <ServicePerfCard key={m.clientServiceId} metric={m} />
                ))}
              </div>
            </section>
          ) : (
            summary.activeServices.length > 0 && (
              <section>
                <p className="section-label mb-4">Performance by service</p>
                <div className="card">
                  <EmptyState
                    title="Performance data is being collected"
                    description="Your account manager is logging reports. Check back soon — your metrics will appear here."
                  />
                </div>
              </section>
            )
          )}

          {/* ── Trend charts ─────────────────────────── */}
          <section className="space-y-4">
            <ReachChart data={summary.reachTrend} />
            <LeadsChart data={summary.leadsTrend} />
          </section>

          {/* ── Active services ──────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Active services</p>
              <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {summary.activeServices.length} running
              </span>
            </div>
            {summary.activeServices.length === 0 ? (
              <div className="card">
                <EmptyState title="No active services yet" description="Contact your account manager to get started." />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {summary.activeServices.map((cs) => (
                  <div
                    key={cs.id}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:shadow-portal-sm motion-reduce:translate-y-0"
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        backgroundColor:
                          CAT[cs.service.category as ServiceCategory]?.dot ?? "#6B7280",
                      }}
                    />
                    <div className="flex items-start gap-3 mb-3">
                      <CategoryIcon category={cs.service.category} />
                      <div className="min-w-0 flex-1">
                        <CategoryBadge category={cs.service.category} />
                        <p className="mt-1.5 font-display text-base font-bold text-[var(--ink)] leading-tight">
                          {cs.service.name}
                        </p>
                      </div>
                      <span className="badge badge-success flex-shrink-0">Active</span>
                    </div>
                    {cs.service.description && (
                      <p className="text-sm leading-relaxed text-[var(--muted)] line-clamp-2 mb-4">
                        {cs.service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                          {cs.billingCycle === "MONTHLY" ? "Monthly" : "One-time"}
                        </span>
                      </div>
                      <span className="font-display text-base font-extrabold text-[var(--ink)] tabular-nums">
                        {formatCurrency(cs.rate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Recent posts ─────────────────────────── */}
          {summary.recentPosts.length > 0 && (
            <section>
              <p className="section-label mb-4">Recent posts</p>
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="portal-table min-w-[400px]">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Published</th>
                      <th className="text-right">Reach</th>
                      <th className="text-right">Likes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePosts.map((post) => (
                      <tr key={post.id}>
                        <td className="td-primary">
                          <PlatformBadge platform={post.platform} />
                        </td>
                        <td>{formatDate(post.publishedAt)}</td>
                        <td className="td-num">
                          <span className="font-semibold text-[var(--ink)]">
                            {post.reach.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="td-num">
                          <span className="font-semibold text-[var(--ink)]">
                            {post.likes.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summary.recentPosts.length > shownPosts && (
                  <div className="border-t border-[var(--border)] px-4 py-3 text-center">
                    <button
                      onClick={() => setShownPosts((s) => s + POSTS_PAGE_SIZE)}
                      className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                    >
                      Show more ({summary.recentPosts.length - shownPosts} remaining)
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Empty state when no services at all */}
          {summary.activeServices.length === 0 && (
            <div className="card">
              <EmptyState
                title="Your dashboard is ready"
                description="Once your account manager activates your services, your performance data will appear right here."
                action={<a href="mailto:info@divyashdigital.co.in" className="btn btn-primary">Get started</a>}
              />
            </div>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────── */}
        <div className="space-y-4 lg:self-start lg:sticky lg:top-6">

          {/* Invoice card */}
          {invoice ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wide ${
                  invStatus?.cls ?? "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {invStatus?.label ?? invoice.status}
              </div>
              <div className="p-5">
                <p className="section-label mb-3">Upcoming invoice</p>
                <p className="font-display text-3xl font-extrabold tabular-nums text-[var(--ink)] leading-none">
                  {formatCurrency(invoice.totalAmount)}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                  {invoice.invoiceNumber}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Due date</span>
                    <span
                      className={`font-semibold ${
                        invoice.status === "OVERDUE"
                          ? "text-danger"
                          : "text-[var(--ink)]"
                      }`}
                    >
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  {dueIn !== null && invoice.status !== "PAID" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">Due in</span>
                      <span
                        className={`font-semibold ${
                          dueIn <= 3
                            ? "text-danger"
                            : dueIn <= 7
                            ? "text-warning"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {dueIn === 0 ? "Today" : `${dueIn} day${dueIn > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Period</span>
                    <span className="text-xs font-medium text-[var(--ink)]">
                      {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/client/invoices/${invoice.id}`}
                  className="btn btn-ghost mt-5 w-full justify-center text-sm"
                >
                  View full invoice
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                {invoice.status !== "PAID" && (
                  <a
                    href="mailto:info@divyashdigital.co.in?subject=Invoice Payment Query"
                    className="btn btn-primary mt-2 w-full justify-center"
                  >
                    Contact for payment
                  </a>
                )}
                {invoice.status === "PAID" && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Invoice fully paid
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-10 text-center px-5">
              <p className="text-sm font-semibold text-[var(--ink)]">No upcoming invoices</p>
              <p className="text-xs text-[var(--muted)] mt-1">You're all clear!</p>
            </div>
          )}

          {/* Total invested */}
          {summary.totalSpendAmount > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="section-label mb-2">Total invested</p>
              <p className="font-display text-2xl font-extrabold tabular-nums text-[var(--ink)]">
                {formatCurrency(summary.totalSpendAmount)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">all time with Divyash Digital</p>
            </div>
          )}

          {/* Quick leads summary */}
          {totalLeadsAll > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="section-label mb-3">Lead pipeline (6 mo)</p>
              <div className="space-y-2">
                {summary.leadsTrend
                  .filter((d) => d.count > 0)
                  .slice(-3)
                  .reverse()
                  .map((d) => (
                    <div
                      key={d.month}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--muted)]">{formatMonth(d.month)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--ink)]">{d.count} leads</span>
                        {d.revenueAttributed > 0 && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatCurrency(d.revenueAttributed)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Agreement details */}
          {clientInfo?.agreementDetails && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="section-label mb-2">Agreement</p>
              <p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">{clientInfo.agreementDetails}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">For a copy of your signed agreement, please contact us.</p>
            </div>
          )}

          {/* Support card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="section-label mb-3">Need help?</p>
            <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
              Your dedicated account team is available Mon–Sat, 10 am – 6 pm IST.
            </p>
            <div className="space-y-2">
              <a
                href="tel:+918810376026"
                className="btn btn-ghost w-full justify-start text-left"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +91 88103 76026
              </a>
              <a
                href="tel:+919266452049"
                className="btn btn-ghost w-full justify-start text-left"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Customer care: +91 92664 52049
              </a>
              <a
                href="mailto:info@divyashdigital.co.in"
                className="btn btn-ghost w-full justify-start text-left"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                info@divyashdigital.co.in
              </a>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}
