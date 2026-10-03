import { ServiceCategory, ReportType as ReportTypeEnum } from "@prisma/client";

/** API/UI-facing key. `ReportTypeEnum` is the DB-facing equivalent. */
export type ReportType =
  | "smm"
  | "seo"
  | "paidAds"
  | "graphicDesigning"
  | "contentCreation"
  | "websiteDevelopment";

export const REPORT_TYPES: ReportType[] = [
  "smm",
  "seo",
  "paidAds",
  "graphicDesigning",
  "contentCreation",
  "websiteDevelopment",
];

// ── Bridge between the API key and the Prisma enum ────────────────────────

const KEY_TO_ENUM: Record<ReportType, ReportTypeEnum> = {
  smm: "SMM",
  seo: "SEO",
  paidAds: "PAID_ADS",
  graphicDesigning: "DESIGN",
  contentCreation: "CONTENT",
  websiteDevelopment: "WEB_DEV",
};

const ENUM_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_ENUM).map(([key, value]) => [value, key])
) as Record<ReportTypeEnum, ReportType>;

export function reportTypeToEnum(key: ReportType): ReportTypeEnum {
  return KEY_TO_ENUM[key];
}

export function reportTypeFromEnum(value: ReportTypeEnum): ReportType {
  return ENUM_TO_KEY[value];
}

/**
 * Default report types per designation. Deliberately an explicit lookup —
 * never infer by matching designation strings at runtime. Used only to
 * pre-tick boxes at invite time; a SUPER_ADMIN can override afterwards.
 * Anything not listed here defaults to none.
 */
export const DESIGNATION_REPORT_TYPES: Record<string, ReportTypeEnum[]> = {
  "Social Media Manager": ["SMM"],
  "SMM Specialist": ["SMM"],
  "SEO Expert": ["SEO"],
  "SEO Specialist": ["SEO"],
  "Performance Marketer": ["PAID_ADS"],
  "Content Creator": ["CONTENT"],
  "Graphic Designer": ["DESIGN"],
  "Web Developer": ["WEB_DEV"],
  // Account Manager, Sales Executive, HR, interns, Influencer, Others:
  // no reporting duty by default — the super admin ticks what's needed.
};

export function defaultReportTypesForDesignation(designation?: string | null): ReportTypeEnum[] {
  if (!designation) return [];
  return DESIGNATION_REPORT_TYPES[designation] ?? [];
}

// ── Shared "has this service been reported on this month" check ──────────
// Used by both the workspace dashboard (reportsDue) and the missing-report
// cron reminder, so the two never drift on what "done" means per type.

import { prisma } from "./prisma";

export async function hasEntryForMonth(
  type: ReportType,
  clientServiceId: string,
  from: Date,
  to: Date
): Promise<boolean> {
  const cs = { clientServiceId };
  switch (type) {
    case "smm":
      return (await prisma.smmReportEntry.count({ where: { ...cs, postedAt: { gte: from, lt: to } } })) > 0;
    case "seo":
      return (await prisma.seoReportEntry.count({ where: { ...cs, entryDate: { gte: from, lt: to } } })) > 0;
    case "paidAds":
      return (await prisma.paidAdsReportEntry.count({ where: { ...cs, month: { gte: from, lt: to } } })) > 0;
    case "graphicDesigning":
      return (await prisma.graphicDesignReportEntry.count({ where: { ...cs, executionDate: { gte: from, lt: to } } })) > 0;
    case "contentCreation":
      return (await prisma.contentCreationReportEntry.count({ where: { ...cs, executionDate: { gte: from, lt: to } } })) > 0;
    case "websiteDevelopment":
      // A project record, not a monthly entry — present at all counts as done
      return (await prisma.websiteDevelopmentReportEntry.count({ where: cs })) > 0;
  }
}

const CATEGORY_TO_TYPE: Partial<Record<ServiceCategory, ReportType>> = {
  SMM: "smm",
  SEO: "seo",
  GOOGLE_ADS: "paidAds",
  META_ADS: "paidAds",
  PERFORMANCE_MARKETING: "paidAds",
  WEB_DESIGN: "websiteDevelopment",
  GRAPHIC_DESIGN: "graphicDesigning",
  CONTENT: "contentCreation",
  // GOOGLE_MY_BUSINESS, LOCAL_SEO, BRAND_PROMOTION, EVENT_COVERAGE: no report
  // template defined yet — pending a field spec from the user. Add an entry
  // here (plus a matching Prisma model + summarize* helper + admin form
  // component) when that's ready.
};

export function reportTypeForCategory(category: ServiceCategory): ReportType | null {
  return CATEGORY_TO_TYPE[category] ?? null;
}

// ── Aggregation helpers — "Client Will See" roll-ups per the reporting spec ──

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function summarizeSmm(entries: Array<{
  postedAt: Date; followersGain: number | null; profileReach: number | null;
  isPaidAd: boolean; paidFollowersGain: number | null; paidLeadsGenerated: number | null;
}>) {
  const totalPosts = entries.length;
  const organicCount = entries.filter((e) => !e.isPaidAd).length;
  const paidCount = entries.filter((e) => e.isPaidAd).length;
  const totalFollowersGain = entries.reduce(
    (s, e) => s + (e.followersGain ?? 0) + (e.paidFollowersGain ?? 0), 0
  );
  const totalProfileReach = entries.reduce((s, e) => s + (e.profileReach ?? 0), 0);
  const totalLeads = entries.reduce((s, e) => s + (e.paidLeadsGenerated ?? 0), 0);

  const reachByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = monthKey(e.postedAt);
    reachByMonth[key] = (reachByMonth[key] ?? 0) + (e.profileReach ?? 0);
  }

  return { totalPosts, organicCount, paidCount, totalFollowersGain, totalProfileReach, totalLeads, reachByMonth };
}

export function summarizeSeo(entries: Array<{
  entryDate: Date; backlinksCreated: number; directorySubmissions: number; articleSubmissions: number;
  imageSubmissions: number; profileCreations: number; trafficGain: number;
  countryTraffic: unknown; serpRanking: string | null; keywordRanking: string | null;
}>) {
  const totalLinksSubmission = entries.reduce(
    (s, e) => s + e.backlinksCreated + e.directorySubmissions + e.articleSubmissions, 0
  );
  const totalArticleCreated = entries.reduce((s, e) => s + e.articleSubmissions, 0);
  const totalImageSubmission = entries.reduce((s, e) => s + e.imageSubmissions, 0);
  const totalProfileCreated = entries.reduce((s, e) => s + e.profileCreations, 0);
  const trafficGain = entries.reduce((s, e) => s + e.trafficGain, 0);

  const countryTraffic: Record<string, number> = {};
  for (const e of entries) {
    if (Array.isArray(e.countryTraffic)) {
      for (const row of e.countryTraffic as Array<{ country?: string; visits?: number }>) {
        if (!row?.country) continue;
        countryTraffic[row.country] = (countryTraffic[row.country] ?? 0) + (row.visits ?? 0);
      }
    }
  }

  const dates = entries.map((e) => e.entryDate.getTime());
  const durationDays = dates.length > 0
    ? Math.max(0, Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000))
    : 0;

  const latest = [...entries].sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime())[0];

  const trafficByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = monthKey(e.entryDate);
    trafficByMonth[key] = (trafficByMonth[key] ?? 0) + e.trafficGain;
  }

  return {
    totalLinksSubmission, totalArticleCreated, totalImageSubmission, totalProfileCreated,
    trafficGain, countryTraffic, durationDays,
    serpRanking: latest?.serpRanking ?? null,
    keywordRanking: latest?.keywordRanking ?? null,
    trafficByMonth,
  };
}

export function summarizePaidAds(entries: Array<{
  campaignName: string; spend: unknown; reach: number | null; conversions: number | null;
  leads: number | null; profileVisits: number | null; revenueGeneratedPct: unknown;
  targetedCountries: unknown; month: Date;
}>) {
  const totalCampaignsCreated = new Set(entries.map((e) => e.campaignName)).size;
  const totalAdSpend = entries.reduce((s, e) => s + Number(e.spend ?? 0), 0);
  const totalReach = entries.reduce((s, e) => s + (e.reach ?? 0), 0);
  const totalConversion = entries.reduce((s, e) => s + (e.conversions ?? 0), 0);
  const totalLeads = entries.reduce((s, e) => s + (e.leads ?? 0), 0);
  const totalProfileVisits = entries.reduce((s, e) => s + (e.profileVisits ?? 0), 0);

  const roasValues = entries
    .map((e) => (e.revenueGeneratedPct != null ? Number(e.revenueGeneratedPct) : null))
    .filter((v): v is number => v != null);
  const roasPct = roasValues.length > 0 ? roasValues.reduce((s, v) => s + v, 0) / roasValues.length : 0;

  const targetedCountries = new Set<string>();
  for (const e of entries) {
    if (Array.isArray(e.targetedCountries)) {
      for (const c of e.targetedCountries as string[]) targetedCountries.add(c);
    }
  }

  const leadsByMonth: Record<string, number> = {};
  const spendByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = monthKey(e.month);
    leadsByMonth[key] = (leadsByMonth[key] ?? 0) + (e.leads ?? 0);
    spendByMonth[key] = (spendByMonth[key] ?? 0) + Number(e.spend ?? 0);
  }

  return {
    totalCampaignsCreated, totalAdSpend, totalReach, totalConversion, totalLeads,
    totalProfileVisits, roasPct, targetedCountries: [...targetedCountries], leadsByMonth, spendByMonth,
  };
}

export function summarizeItemLog(entries: Array<{
  itemCount?: number; executionDate: Date; submissionDate: Date | null;
  designType?: string; contentType?: string;
}>) {
  const totalItems = entries.reduce((s, e) => s + (e.itemCount ?? 1), 0);
  const latestSubmissionDate = entries
    .map((e) => e.submissionDate)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const items = [...entries]
    .sort((a, b) => b.executionDate.getTime() - a.executionDate.getTime())
    .map((e) => ({ type: e.designType ?? e.contentType ?? null, executionDate: e.executionDate, submissionDate: e.submissionDate }));

  const itemsByMonth: Record<string, number> = {};
  for (const e of entries) {
    const key = monthKey(e.executionDate);
    itemsByMonth[key] = (itemsByMonth[key] ?? 0) + (e.itemCount ?? 1);
  }

  return { totalItems, latestSubmissionDate, items, itemsByMonth };
}

export function summarizeWebsiteDevelopment(entries: Array<{
  websiteLink: string | null; domainPlatform: string | null; hosting: string | null;
  seoEnhanced: boolean; platformLanguage: string | null; maintenanceAgreed: boolean;
  executionDate: Date | null; submissionDate: Date | null; createdAt: Date;
}>) {
  const latest = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!latest) return null;
  const { websiteLink, domainPlatform, hosting, seoEnhanced, platformLanguage, maintenanceAgreed, executionDate, submissionDate } = latest;
  return { websiteLink, domainPlatform, hosting, seoEnhanced, platformLanguage, maintenanceAgreed, executionDate, submissionDate };
}
