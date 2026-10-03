// Shared by the admin ("/admin/reporting") and workspace
// ("/workspace/clients/[clientId]") logged-entries tables — both render the
// same six report types' raw entries, so the field→label mapping lives here
// once instead of drifting across two copies.

import type { ReportType } from "@/types";

export const ENTRY_DATE_FIELD: Record<ReportType, string> = {
  smm: "postedAt",
  seo: "entryDate",
  paidAds: "month",
  graphicDesigning: "executionDate",
  contentCreation: "executionDate",
  websiteDevelopment: "createdAt",
};

interface SummaryField {
  key: string;
  label: string;
}

// A brief, labeled summary (not a raw "50 · 50 · 50") — just the 2-3 fields
// that make an entry recognizable at a glance.
export const ENTRY_SUMMARY_FIELDS: Record<ReportType, SummaryField[]> = {
  smm: [
    { key: "platform", label: "Platform" },
    { key: "postType", label: "Type" },
    { key: "profileReach", label: "Reach" },
  ],
  seo: [
    { key: "backlinksCreated", label: "Backlinks" },
    { key: "articleSubmissions", label: "Articles" },
    { key: "trafficGain", label: "Traffic" },
  ],
  paidAds: [
    { key: "campaignName", label: "Campaign" },
    { key: "objective", label: "Objective" },
    { key: "spend", label: "Spend" },
  ],
  graphicDesigning: [
    { key: "designType", label: "Type" },
    { key: "itemCount", label: "Items" },
  ],
  contentCreation: [{ key: "contentType", label: "Type" }],
  websiteDevelopment: [
    { key: "websiteType", label: "Type" },
    { key: "hosting", label: "Hosting" },
  ],
};

export function formatEntrySummary(reportType: ReportType, entry: Record<string, unknown>): string {
  return ENTRY_SUMMARY_FIELDS[reportType]
    .map((f) => {
      const v = entry[f.key];
      if (v === null || v === undefined || v === "") return null;
      return `${f.label}: ${v}`;
    })
    .filter(Boolean)
    .join(" · ");
}

/** Every entry row from the admin/workspace list endpoints now includes this
 * (see backend/src/modules/serviceReports.module.ts's `createdBy` include) —
 * null only for historical rows logged before authorship tracking existed. */
export function entryAuthorName(entry: Record<string, unknown>): string {
  const createdBy = entry.createdBy as { name?: string } | null | undefined;
  return createdBy?.name ?? "—";
}
