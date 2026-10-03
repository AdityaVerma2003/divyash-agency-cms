"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
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

export default function ClientServiceReportingDetailPage() {
  const params = useParams();
  const clientServiceId = params.clientServiceId as string;
  const token = getAccessToken();

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [serviceName, setServiceName] = useState<string>("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/client/dashboard" className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 font-display text-xl font-bold text-[var(--ink)]">{serviceName}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Detailed {REPORT_TYPE_LABELS[reportType]} reporting log — every update logged by your account manager.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No entries logged yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Check back soon — your account manager will log updates here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  {columns.map((col) => (
                    <th key={col.label} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id as string} className="border-b border-[var(--border)] last:border-0">
                    {columns.map((col) => (
                      <td key={col.label} className="whitespace-nowrap px-4 py-3 text-[var(--ink)]">
                        {col.render(entry)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
