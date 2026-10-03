"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import Modal from "@/components/Modal";
import { Icon } from "@/components/icons";
import { REPORT_TYPE_LABELS } from "@/lib/reportTypes";
import type { ReportType } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount));
}
function yesNo(v: boolean) {
  return v ? "Yes" : "No";
}

type Entry = Record<string, unknown>;

interface Column {
  label: string;
  render: (e: Entry) => React.ReactNode;
}

// The field each report type's date column reads from — also what "Today" /
// "This month" export scoping filters on.
const DATE_FIELD: Record<ReportType, string> = {
  smm: "postedAt",
  seo: "entryDate",
  paidAds: "month",
  graphicDesigning: "executionDate",
  contentCreation: "executionDate",
  websiteDevelopment: "createdAt",
};

const COLUMNS: Record<ReportType, Column[]> = {
  smm: [
    { label: "Date", render: (e) => formatDate(e.postedAt as string) },
    { label: "Post type", render: (e) => e.postType as string },
    { label: "Platform", render: (e) => (e.platformOther as string) || (e.platform as string) },
    { label: "Marketing", render: (e) => e.marketingType as string },
    { label: "Followers gain", render: (e) => (e.followersGain as number) ?? "—" },
    { label: "Profile reach", render: (e) => (e.profileReach as number) ?? "—" },
    { label: "Likes", render: (e) => (e.postLikes as number) ?? "—" },
    { label: "Profile visits", render: (e) => (e.profileVisits as number) ?? "—" },
    { label: "Paid ad?", render: (e) => yesNo(e.isPaidAd as boolean) },
    { label: "Ad spend", render: (e) => (e.paidAdSpend != null ? formatCurrency(e.paidAdSpend as number) : "—") },
    { label: "Leads (paid)", render: (e) => (e.paidLeadsGenerated as number) ?? "—" },
  ],
  seo: [
    { label: "Date", render: (e) => formatDate(e.entryDate as string) },
    { label: "Backlinks", render: (e) => e.backlinksCreated as number },
    { label: "Directory subs", render: (e) => e.directorySubmissions as number },
    { label: "Article subs", render: (e) => e.articleSubmissions as number },
    { label: "Image subs", render: (e) => e.imageSubmissions as number },
    { label: "Profile creations", render: (e) => e.profileCreations as number },
    { label: "Approved links", render: (e) => e.approvedLinks as number },
    { label: "Traffic gain", render: (e) => e.trafficGain as number },
    { label: "Keyword ranking", render: (e) => (e.keywordRanking as string) || "—" },
    { label: "SERP ranking", render: (e) => (e.serpRanking as string) || "—" },
  ],
  paidAds: [
    { label: "Month", render: (e) => formatMonth(e.month as string) },
    { label: "Campaign", render: (e) => e.campaignName as string },
    { label: "Objective", render: (e) => e.objective as string },
    { label: "Spend", render: (e) => formatCurrency(e.spend as number) },
    { label: "Reach", render: (e) => (e.reach as number) ?? "—" },
    { label: "Conversions", render: (e) => (e.conversions as number) ?? "—" },
    { label: "Leads", render: (e) => (e.leads as number) ?? "—" },
    { label: "Profile visits", render: (e) => (e.profileVisits as number) ?? "—" },
    { label: "Revenue %", render: (e) => (e.revenueGeneratedPct != null ? `${e.revenueGeneratedPct}%` : "—") },
  ],
  graphicDesigning: [
    { label: "Execution date", render: (e) => formatDate(e.executionDate as string) },
    { label: "Type", render: (e) => (e.designTypeOther as string) || (e.designType as string) },
    { label: "Items", render: (e) => e.itemCount as number },
    { label: "Submission date", render: (e) => (e.submissionDate ? formatDate(e.submissionDate as string) : "—") },
    { label: "Notes", render: (e) => (e.notes as string) || "—" },
  ],
  contentCreation: [
    { label: "Execution date", render: (e) => formatDate(e.executionDate as string) },
    { label: "Type", render: (e) => (e.contentTypeOther as string) || (e.contentType as string) },
    { label: "Submission date", render: (e) => (e.submissionDate ? formatDate(e.submissionDate as string) : "—") },
    { label: "Notes", render: (e) => (e.notes as string) || "—" },
  ],
  websiteDevelopment: [
    { label: "Logged", render: (e) => formatDate(e.createdAt as string) },
    { label: "Type", render: (e) => (e.websiteTypeOther as string) || (e.websiteType as string) },
    { label: "Pages", render: (e) => (e.pageCount as number) ?? "—" },
    { label: "Platform / language", render: (e) => (e.platformLanguage as string) || "—" },
    { label: "Domain platform", render: (e) => (e.domainPlatform as string) || "—" },
    { label: "Hosting", render: (e) => (e.hosting === "DD_SHARED" ? "Divyash shared" : e.hosting === "CLIENT_OWN" ? "Client-owned" : "—") },
    {
      label: "Website link",
      render: (e) =>
        e.websiteLink ? (
          <a href={e.websiteLink as string} target="_blank" rel="noreferrer" className="text-coral-600 hover:underline">
            {e.websiteLink as string}
          </a>
        ) : (
          "—"
        ),
    },
    { label: "SEO enhanced", render: (e) => yesNo(e.seoEnhanced as boolean) },
    { label: "Maintenance", render: (e) => yesNo(e.maintenanceAgreed as boolean) },
  ],
};

// The 1-2 fields shown directly in the compact row, by column label — enough
// to recognize the entry at a glance; everything else lives behind "View more".
const PRIMARY_LABELS: Record<ReportType, string[]> = {
  smm: ["Platform", "Profile reach"],
  seo: ["Backlinks", "Traffic gain"],
  paidAds: ["Campaign", "Spend"],
  graphicDesigning: ["Type", "Items"],
  contentCreation: ["Type"],
  websiteDevelopment: ["Type", "Hosting"],
};

function cellText(col: Column, entry: Entry): string {
  // Every column renders a plain string/number except "Website link" (an <a>
  // element) — pull its raw value directly for CSV instead of stringifying JSX.
  if (col.label === "Website link") return (entry.websiteLink as string) ?? "";
  const rendered = col.render(entry);
  return typeof rendered === "string" || typeof rendered === "number" ? String(rendered) : "";
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildCsv(columns: Column[], rows: Entry[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((entry) => columns.map((c) => csvEscape(cellText(c, entry))).join(","));
  return [header, ...lines].join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  // UTF-8 BOM so Excel (not just a text editor) opens it with correct encoding.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can race with the browser actually starting the
  // download in some engines — defer it to the next tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type ExportScope = "today" | "month" | "all";
const EXPORT_SCOPES: { value: ExportScope; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "month", label: "This month" },
  { value: "all", label: "All" },
];

function scopeFilter(entries: Entry[], scope: ExportScope, dateField: string): Entry[] {
  if (scope === "all") return entries;
  const now = new Date();
  return entries.filter((e) => {
    const raw = e[dateField];
    if (!raw) return false;
    const d = new Date(raw as string);
    if (scope === "today") return d.toDateString() === now.toDateString();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export default function ClientServiceReportingDetailPage() {
  const params = useParams();
  const clientServiceId = params.clientServiceId as string;
  const token = getAccessToken();

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [serviceName, setServiceName] = useState<string>("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);

  useEffect(() => {
    api
      .get<{ reportType: ReportType; serviceName: string; entries: Entry[] }>(
        `/portal/service-reports/entries?clientServiceId=${clientServiceId}`,
        token
      )
      .then((res) => {
        setReportType(res.reportType);
        setServiceName(res.serviceName);
        setEntries(res.entries);
      })
      .catch((err: Error) => setError(err.message));
  }, [clientServiceId]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!entries || !reportType) return <PageLoader fullScreen={false} />;

  const columns = COLUMNS[reportType];
  const dateCol = columns[0];
  const primaryCols = columns.filter((c) => PRIMARY_LABELS[reportType].includes(c.label));
  const dateField = DATE_FIELD[reportType];

  function handleExport(scope: ExportScope) {
    const rows = scopeFilter(entries!, scope, dateField);
    const csv = buildCsv(columns, rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`${serviceName || "report"}-${scope}-${stamp}.csv`, csv);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/client/dashboard" className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 font-display text-xl font-bold text-[var(--ink)]">{serviceName}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Detailed {REPORT_TYPE_LABELS[reportType]} reporting log — every update logged by your account manager.
          </p>
        </div>

        {entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Export</span>
            {EXPORT_SCOPES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleExport(s.value)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all"
              >
                <Icon name="download" size={13} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No entries logged yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Check back soon — your account manager will log updates here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-[var(--border)]">
            {entries.map((entry) => (
              <div key={entry.id as string} className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3">
                <span className="w-[92px] shrink-0 text-xs font-medium text-[var(--muted)]">{dateCol.render(entry)}</span>
                {primaryCols.map((col) => (
                  <span key={col.label} className="text-sm">
                    <span className="text-[var(--muted)]">{col.label}: </span>
                    <span className="font-semibold text-[var(--ink)]">{col.render(entry)}</span>
                  </span>
                ))}
                <button
                  onClick={() => setDetailEntry(entry)}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-coral-600 hover:underline"
                >
                  View more
                  <Icon name="chevronRight" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailEntry && (
        <Modal title={`${REPORT_TYPE_LABELS[reportType]} entry — ${dateCol.render(detailEntry)}`} onClose={() => setDetailEntry(null)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {columns.map((col) => (
              <div key={col.label}>
                <p className="text-xs text-[var(--muted)]">{col.label}</p>
                <p className="text-sm font-medium text-[var(--ink)]">{col.render(detailEntry)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setDetailEntry(null)} className="btn btn-ghost">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
