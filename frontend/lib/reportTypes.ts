import type { ReportType } from "@/types";

const CATEGORY_TO_TYPE: Record<string, ReportType | undefined> = {
  SMM: "smm",
  SEO: "seo",
  GOOGLE_ADS: "paidAds",
  META_ADS: "paidAds",
  PERFORMANCE_MARKETING: "paidAds",
  WEB_DESIGN: "websiteDevelopment",
  GRAPHIC_DESIGN: "graphicDesigning",
  CONTENT: "contentCreation",
};

export function reportTypeForCategory(category: string): ReportType | null {
  return CATEGORY_TO_TYPE[category] ?? null;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  smm: "Social Media Management",
  seo: "SEO",
  paidAds: "Paid Ads",
  graphicDesigning: "Graphic Designing",
  contentCreation: "Content Creation",
  websiteDevelopment: "Website Development",
};
