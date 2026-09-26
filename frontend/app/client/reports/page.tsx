"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

interface ClientReport {
  id: string;
  weekStartDate: string;
  smmTotalPosts?: number | null;
  smmReach?: number | null;
  smmTraffic?: number | null;
  seoBacklinks?: number | null;
  seoTrafficGrowth?: number | null;
  seoKeywordRanks?: string | null;
  seoBlogsCount?: number | null;
  seoErrors?: string | null;
  paidAdsReportUrl?: string | null;
  localSeoReviewsGained?: number | null;
  localSeoPosts?: number | null;
  localSeoTotalClicks?: number | null;
  localSeoCallsReceived?: number | null;
  localSeoProfileInteractions?: number | null;
  localSeoBookings?: number | null;
}

type Tab = "smm" | "seo" | "paid-ads" | "local-seo";

function StatCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-[var(--ink)]">{typeof value === "number" ? new Intl.NumberFormat("en-IN").format(value) : value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="card py-12 text-center">
      <p className="text-sm text-[var(--muted)]">No {label} data recorded for this week yet.</p>
    </div>
  );
}

export default function ClientReportsPage() {
  const [reports, setReports] = useState<ClientReport[] | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("smm");

  useEffect(() => {
    api.get<ClientReport[]>("/portal/reports", getAccessToken())
      .then((data) => {
        setReports(data);
        if (data.length > 0) setSelectedWeek(data[0].weekStartDate.slice(0, 10));
      })
      .catch(() => setReports([]));
  }, []);

  const current = reports?.find((r) => r.weekStartDate.slice(0, 10) === selectedWeek) ?? null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "smm", label: "SMM" },
    { key: "seo", label: "SEO" },
    { key: "paid-ads", label: "Paid Ads" },
    { key: "local-seo", label: "Local SEO" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--ink)]">Reports</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Weekly performance reports prepared by your account team.</p>
      </div>

      {!reports ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No reports yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Your account manager will add weekly reports here soon.</p>
        </div>
      ) : (
        <>
          {/* Week selector */}
          <div className="card">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Select week</label>
            <select
              value={selectedWeek ?? ""}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 transition-colors"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.weekStartDate.slice(0, 10)}>
                  Week of {r.weekStartDate.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border)]">
            <div className="flex gap-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.key
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === "smm" && (
            current?.smmTotalPosts == null && current?.smmReach == null && current?.smmTraffic == null ? (
              <EmptyTab label="SMM" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total No. of Posts" value={current?.smmTotalPosts} />
                <StatCard label="Reach" value={current?.smmReach} />
                <StatCard label="Traffic" value={current?.smmTraffic} />
              </div>
            )
          )}

          {activeTab === "seo" && (
            current?.seoBacklinks == null && current?.seoTrafficGrowth == null && current?.seoBlogsCount == null ? (
              <EmptyTab label="SEO" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <StatCard label="Total No. of Backlinks" value={current?.seoBacklinks} />
                  <StatCard label="Traffic Growth (%)" value={current?.seoTrafficGrowth != null ? `${current.seoTrafficGrowth}%` : null} />
                  <StatCard label="No. of Blogs Published" value={current?.seoBlogsCount} />
                </div>
                {current?.seoKeywordRanks && (
                  <div className="card">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Keyword Ranks</p>
                    <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">{current.seoKeywordRanks}</p>
                  </div>
                )}
                {current?.seoErrors && (
                  <div className="card border-l-4 border-l-amber-400">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Errors / Issues</p>
                    <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">{current.seoErrors}</p>
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === "paid-ads" && (
            <div className="card space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Paid Ads Report</p>
              {current?.paidAdsReportUrl ? (
                <a
                  href={current.paidAdsReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  View Ads Report
                </a>
              ) : (
                <p className="text-sm text-[var(--muted)]">No report uploaded for this week yet.</p>
              )}
            </div>
          )}

          {activeTab === "local-seo" && (
            current?.localSeoReviewsGained == null && current?.localSeoPosts == null
              && current?.localSeoTotalClicks == null && current?.localSeoCallsReceived == null
              && current?.localSeoProfileInteractions == null && current?.localSeoBookings == null ? (
              <EmptyTab label="Local SEO" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Reviews Gained" value={current?.localSeoReviewsGained} />
                <StatCard label="No. of Posts" value={current?.localSeoPosts} />
                <StatCard label="Total Clicks" value={current?.localSeoTotalClicks} />
                <StatCard label="Calls Received" value={current?.localSeoCallsReceived} />
                <StatCard label="Profile Interactions" value={current?.localSeoProfileInteractions} />
                <StatCard label="Bookings" value={current?.localSeoBookings} />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
