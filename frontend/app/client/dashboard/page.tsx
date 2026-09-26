"use client";

import { useEffect, useState, useCallback } from "react";
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
import type { ClientDashboardSummary, AuthUser, PerServiceMetric, Post, Client } from "@/types";

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

/* ── Doodles ─────────────────────────────────────────────────────────────── */
function DoodleRocket() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
function DoodleStar() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function DoodleChart() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 34 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="2,28 9,20 15,24 22,12 28,6" />
      <polyline points="24,6 28,6 28,10" />
      <line x1="2" y1="30" x2="32" y2="30" strokeWidth="1.5" />
    </svg>
  );
}

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

/* ── Per-service performance card ────────────────────────────────────────── */
function ServicePerfCard({ metric }: { metric: PerServiceMetric }) {
  const cfg = CAT[metric.category as ServiceCategory];
  const dot = cfg?.dot ?? "#6B7280";
  const iconBg = cfg?.iconBg ?? "#6B7280";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:-translate-y-0.5 motion-reduce:translate-y-0">
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
        <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Metrics grid */}
      {"totalPosts" in metric ? (
        // SMM
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile
            value={String(metric.totalPosts)}
            label="Posts"
            sub="last 3 mo"
            accent={iconBg}
          />
          <MetricTile
            value={formatNumber(metric.totalReach)}
            label="Reach"
            sub="last 3 mo"
          />
          <MetricTile
            value={formatNumber(metric.totalEngagement)}
            label="Engagement"
            sub="likes+comments"
          />
        </div>
      ) : "totalSpend" in metric ? (
        // GOOGLE_ADS / META_ADS
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3">
          <MetricTile
            value={formatCurrency(metric.totalSpend)}
            label="Spend"
            sub="last 3 mo"
            accent={iconBg}
          />
          <MetricTile
            value={String(metric.totalConversions)}
            label="Conversions"
            sub="last 3 mo"
          />
          <MetricTile
            value={`${metric.avgROAS.toFixed(2)}×`}
            label="Avg ROAS"
            sub="return on ad spend"
          />
        </div>
      ) : (
        // Other — no detailed metrics yet
        <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">
            Detailed performance reporting is not available for this service type yet.
          </p>
        </div>
      )}
    </div>
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
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-1 bg-gradient-to-r from-[#0284C7] to-[#2DBFA0]" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label">Reach over time</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Monthly organic reach across all social posts</p>
          </div>
          <div className="text-[var(--muted)] opacity-30">
            <DoodleChart />
          </div>
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 text-[var(--muted)] opacity-30">
              <DoodleChart />
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">No reach data yet</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Posts published by your team will appear here once data is logged.
            </p>
          </div>
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
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-1 bg-gradient-to-r from-[#7C3AED] to-[#6366F1]" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label">Lead pipeline</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Monthly new leads and attributed revenue</p>
          </div>
          <div className="text-[var(--muted)] opacity-30">
            <DoodleRocket />
          </div>
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 text-[var(--muted)] opacity-30">
              <DoodleRocket />
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">No leads logged yet</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Your account manager will log leads as they come in from your campaigns.
            </p>
          </div>
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

function RecentPostsSection({ clientId }: { clientId: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [shown, setShown] = useState(POSTS_PAGE_SIZE);

  const load = useCallback(async () => {
    try {
      // Fetch posts for all SMM services of this client via posts endpoint
      // We use the global posts list scoped to client via clientServiceId; since we don't have
      // a client-level posts endpoint, fetch recent posts via dashboard recentPosts already in
      // the summary but that's capped at 5. Instead load posts per clientServiceId fetched from
      // active services — but we don't have that here. Use a simple GET with no filter but
      // CLIENT role scoping will restrict to own posts. We simulate by fetching a generous list.
      // The backend /posts endpoint requires clientServiceId, so we'll use recentPosts from
      // summary for the table (already fetched) and expose via prop.
      setPosts([]); // placeholder — actual data comes via prop `recentPosts`
    } catch {
      setPosts([]);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return null; // rendered inline below using summary.recentPosts
}

/* ── Stat pill used in top strip ─────────────────────────────────────────── */
function StatPill({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">{label}</p>
    </div>
  );
}

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
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-[var(--border)] opacity-50" />
        <div className="h-8 w-48 rounded-lg bg-[var(--border)] opacity-30" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-[var(--border)] opacity-30" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-[var(--border)] opacity-20" />
          <div className="h-64 rounded-2xl bg-[var(--border)] opacity-20" />
        </div>
      </div>
    );
  }

  const isSuspended = clientInfo?.status === "SUSPENDED";

  const invoice = summary.upcomingInvoice;
  const invStatus = invoice ? INV_STATUS[invoice.status] : null;
  const dueIn = invoice ? daysUntil(invoice.dueDate) : null;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // SMM and Ads perService entries
  const smmMetrics = summary.perService.filter((m) => m.category === "SMM");
  const adsMetrics = summary.perService.filter(
    (m) => m.category === "GOOGLE_ADS" || m.category === "META_ADS"
  );
  const hasPerformance = smmMetrics.length > 0 || adsMetrics.length > 0;

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

      {/* ── Welcome hero card ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-coral-500 to-coral-600 p-6 text-white">
        <div
          className="blob pointer-events-none absolute -right-10 -top-10 h-40 w-40 bg-white opacity-[0.07]"
          aria-hidden
        />
        <div
          className="blob pointer-events-none absolute -bottom-8 left-1/3 h-28 w-28 bg-coral-700 opacity-30"
          aria-hidden
          style={{ animationDelay: "-4s" }}
        />
        <div className="pointer-events-none absolute right-20 top-3 text-white opacity-[0.12]" aria-hidden>
          <DoodleRocket />
        </div>
        <div className="pointer-events-none absolute right-6 bottom-3 text-white opacity-[0.10]" aria-hidden>
          <DoodleStar />
        </div>
        <div className="pointer-events-none absolute right-[45%] top-2 text-white opacity-[0.08]" aria-hidden>
          <DoodleChart />
        </div>

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <span className="font-display text-sm font-extrabold text-white">👋</span>
              </div>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                Welcome back
              </span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white leading-tight">
              {firstName}!
            </h1>
            <p className="mt-1 text-sm text-white/75">
              {summary.activeServices.length > 0
                ? `${summary.activeServices.length} active service${summary.activeServices.length > 1 ? "s" : ""} running — here's what they're delivering.`
                : "No active services yet — get in touch to get started."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadReport}
              disabled={downloadingReport}
              className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur-sm disabled:opacity-60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloadingReport ? "Generating…" : "Monthly report"}
            </button>
            <a
              href="mailto:info@divyashdigital.co.in"
              className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Contact us
            </a>
          </div>
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

      {/* ── Snapshot strip ────────────────────────────── */}
      {!isSuspended && (totalReachAll > 0 || totalLeadsAll > 0 || summary.totalSpendAmount > 0) && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="h-1 bg-gradient-to-r from-coral-500 via-[#2DBFA0] to-[#5B7CF7]" />
          <div className="overflow-x-auto">
          <div className="grid grid-cols-3 divide-x divide-[var(--border)] p-5 min-w-[320px]">
            <StatPill
              value={formatNumber(totalReachAll)}
              label="Total reach (6 mo)"
              color="#2DBFA0"
            />
            <StatPill
              value={String(totalLeadsAll)}
              label="Leads (6 mo)"
              color="#5B7CF7"
            />
            <StatPill
              value={formatCurrency(summary.totalSpendAmount)}
              label="Total invested"
              color="#6366F1"
            />
          </div>
          </div>
        </div>
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
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-14 text-center px-6">
                  <div className="mb-3 text-[var(--muted)] opacity-40">
                    <DoodleChart />
                  </div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Performance data is being collected
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">
                    Your account manager is logging posts, campaigns and leads. Check back soon — your metrics will appear here.
                  </p>
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-14 text-center">
                <div className="mb-3 text-[var(--muted)] opacity-40">
                  <DoodleRocket />
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">No active services yet</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Contact your account manager to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {summary.activeServices.map((cs) => (
                  <div
                    key={cs.id}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:-translate-y-0.5 motion-reduce:translate-y-0"
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
                      <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-20 text-center px-6">
              <div className="mb-4 text-[var(--muted)] opacity-30">
                <DoodleRocket />
              </div>
              <p className="text-base font-bold text-[var(--ink)]">Your dashboard is ready</p>
              <p className="text-sm text-[var(--muted)] mt-2 max-w-xs leading-relaxed">
                Once your account manager activates your services, your performance data will appear right here.
              </p>
              <a
                href="mailto:info@divyashdigital.co.in"
                className="btn btn-primary mt-6"
              >
                Get started
              </a>
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
