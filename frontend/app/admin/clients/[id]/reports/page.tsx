"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";

interface ClientReport {
  id: string;
  clientId: string;
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

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminClientReportsPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const { success, error: toastError } = useToast();

  const [reports, setReports] = useState<ClientReport[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(toDateInput(getMonday(new Date())));
  const [activeTab, setActiveTab] = useState<Tab>("smm");
  const [current, setCurrent] = useState<Partial<ClientReport>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadReports = useCallback(() => {
    api
      .get<ClientReport[]>(`/admin/clients/${clientId}/reports`, getAccessToken())
      .then(setReports)
      .catch(() => setReports([]));
  }, [clientId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    const match = reports.find((r) => r.weekStartDate.slice(0, 10) === selectedWeek);
    setCurrent(match ?? {});
  }, [selectedWeek, reports]);

  function numField(key: keyof ClientReport) {
    const val = (current as Record<string, unknown>)[key];
    return val != null ? String(val) : "";
  }

  function setNum(key: keyof ClientReport, val: string) {
    setCurrent((prev) => ({ ...prev, [key]: val === "" ? undefined : Number(val) }));
  }

  function setStr(key: keyof ClientReport, val: string) {
    setCurrent((prev) => ({ ...prev, [key]: val || undefined }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        weekStartDate: new Date(selectedWeek).toISOString(),
        smmTotalPosts: current.smmTotalPosts ?? undefined,
        smmReach: current.smmReach ?? undefined,
        smmTraffic: current.smmTraffic ?? undefined,
        seoBacklinks: current.seoBacklinks ?? undefined,
        seoTrafficGrowth: current.seoTrafficGrowth ?? undefined,
        seoKeywordRanks: current.seoKeywordRanks ?? undefined,
        seoBlogsCount: current.seoBlogsCount ?? undefined,
        seoErrors: current.seoErrors ?? undefined,
        localSeoReviewsGained: current.localSeoReviewsGained ?? undefined,
        localSeoPosts: current.localSeoPosts ?? undefined,
        localSeoTotalClicks: current.localSeoTotalClicks ?? undefined,
        localSeoCallsReceived: current.localSeoCallsReceived ?? undefined,
        localSeoProfileInteractions: current.localSeoProfileInteractions ?? undefined,
        localSeoBookings: current.localSeoBookings ?? undefined,
      };
      const saved = await api.post<ClientReport>(`/admin/clients/${clientId}/reports`, payload, getAccessToken());
      setCurrent(saved);
      loadReports();
      success("Report saved", `Week of ${selectedWeek}`);
    } catch (err) {
      toastError("Could not save report", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPaidAdsFile(file: File) {
    if (!current.id && !reports.find((r) => r.weekStartDate.slice(0, 10) === selectedWeek)) {
      toastError("Save first", "Save the report for this week before uploading the paid ads file.");
      return;
    }
    const reportId = current.id ?? reports.find((r) => r.weekStartDate.slice(0, 10) === selectedWeek)?.id;
    if (!reportId) return;
    setUploading(true);
    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBase}/admin/clients/${clientId}/reports/${reportId}/paid-ads-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json() as { paidAdsReportUrl: string };
      setCurrent((prev) => ({ ...prev, paidAdsReportUrl: data.paidAdsReportUrl }));
      success("File uploaded", "Paid ads report uploaded.");
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "smm", label: "SMM" },
    { key: "seo", label: "SEO" },
    { key: "paid-ads", label: "Paid Ads" },
    { key: "local-seo", label: "Local SEO" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/clients/${clientId}`} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            ← Back to client
          </Link>
          <h1 className="mt-1 text-xl font-bold text-[var(--ink)]">Weekly Reports</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save report"}
        </button>
      </div>

      {/* Week selector */}
      <div className="card flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Week of (Monday)</label>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className={`${inputCls} w-auto`}
          />
        </div>
        {reports.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Past weeks</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className={`${inputCls} w-auto`}
            >
              {reports.map((r) => (
                <option key={r.id} value={r.weekStartDate.slice(0, 10)}>
                  Week of {r.weekStartDate.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
        )}
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
      <div className="card space-y-5">
        {activeTab === "smm" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Social Media Marketing</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Total No. of Posts</label>
                <input type="number" min="0" value={numField("smmTotalPosts")} onChange={(e) => setNum("smmTotalPosts", e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Reach</label>
                <input type="number" min="0" value={numField("smmReach")} onChange={(e) => setNum("smmReach", e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Traffic</label>
                <input type="number" min="0" value={numField("smmTraffic")} onChange={(e) => setNum("smmTraffic", e.target.value)} className={inputCls} placeholder="0" />
              </div>
            </div>
          </>
        )}

        {activeTab === "seo" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Search Engine Optimisation</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Total No. of Backlinks</label>
                <input type="number" min="0" value={numField("seoBacklinks")} onChange={(e) => setNum("seoBacklinks", e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Traffic Growth (%)</label>
                <input type="number" step="0.01" value={numField("seoTrafficGrowth")} onChange={(e) => setNum("seoTrafficGrowth", e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">No. of Blogs Published</label>
                <input type="number" min="0" value={numField("seoBlogsCount")} onChange={(e) => setNum("seoBlogsCount", e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Keyword Ranks (notes)</label>
                <textarea rows={2} value={current.seoKeywordRanks ?? ""} onChange={(e) => setStr("seoKeywordRanks", e.target.value)} className={`${inputCls} resize-none`} placeholder="e.g. #1 for 'digital agency Delhi'" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-[var(--muted)]">Any Errors / Issues</label>
                <textarea rows={2} value={current.seoErrors ?? ""} onChange={(e) => setStr("seoErrors", e.target.value)} className={`${inputCls} resize-none`} placeholder="Crawl errors, broken links, etc." />
              </div>
            </div>
          </>
        )}

        {activeTab === "paid-ads" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Paid Ads Report</p>
            <p className="text-sm text-[var(--muted)]">Upload the paid ads performance PDF for this week.</p>
            {current.paidAdsReportUrl && (
              <a
                href={current.paidAdsReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                View current PDF
              </a>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-60 transition-colors"
              >
                {uploading ? "Uploading…" : current.paidAdsReportUrl ? "Replace PDF" : "Upload PDF"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPaidAdsFile(f); }}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">PDF only — max 10 MB. Save the report first if this is a new week.</p>
            </div>
          </>
        )}

        {activeTab === "local-seo" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Local SEO</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "localSeoReviewsGained" as const, label: "Reviews Gained" },
                { key: "localSeoPosts" as const, label: "No. of Posts" },
                { key: "localSeoTotalClicks" as const, label: "Total Clicks" },
                { key: "localSeoCallsReceived" as const, label: "Calls Received" },
                { key: "localSeoProfileInteractions" as const, label: "Profile Interactions" },
                { key: "localSeoBookings" as const, label: "Bookings" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-[var(--muted)]">{label}</label>
                  <input type="number" min="0" value={numField(key)} onChange={(e) => setNum(key, e.target.value)} className={inputCls} placeholder="0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
