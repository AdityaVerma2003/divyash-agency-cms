-- Add the createdBy relation (FK constraint) on top of each report entry
-- model's existing createdById column, so "who entered this" can be fetched
-- via a real Prisma include instead of a second manual lookup. Nullable
-- (ON DELETE SET NULL) — deleting a team member must never delete or corrupt
-- historical report data, it just loses the author attribution on it.

ALTER TABLE "SmmReportEntry" ADD CONSTRAINT "SmmReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SeoReportEntry" ADD CONSTRAINT "SeoReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaidAdsReportEntry" ADD CONSTRAINT "PaidAdsReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GraphicDesignReportEntry" ADD CONSTRAINT "GraphicDesignReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentCreationReportEntry" ADD CONSTRAINT "ContentCreationReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WebsiteDevelopmentReportEntry" ADD CONSTRAINT "WebsiteDevelopmentReportEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
