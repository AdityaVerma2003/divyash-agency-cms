-- CreateEnum
CREATE TYPE "SmmPostType" AS ENUM ('STATIC', 'CAROUSEL', 'REEL');
CREATE TYPE "SmmPlatform" AS ENUM ('META', 'YOUTUBE', 'WHATSAPP', 'LINKEDIN', 'X', 'OTHER');
CREATE TYPE "SmmMarketingType" AS ENUM ('ORGANIC', 'PAID');
CREATE TYPE "PaidAdsObjective" AS ENUM ('LEAD_GEN', 'AWARENESS', 'SALES', 'TRAFFIC', 'PROMOTION');
CREATE TYPE "GraphicDesignType" AS ENUM ('VIDEO_EDITING', 'BRANDING', 'SOCIAL_MEDIA_POST', 'AUDIO_BOOSTING', 'LONG_VIDEO_EDITING', 'THREE_D_ANIMATION', 'LOGO_DESIGN', 'OTHER');
CREATE TYPE "ContentCreationType" AS ENUM ('CONTENT_SHOOT', 'COPYWRITING', 'SCRIPT_WRITING', 'OTHER');
CREATE TYPE "WebsiteType" AS ENUM ('INFOGRAPHIC', 'BRAND', 'ECOMMERCE', 'CUSTOM_CODED', 'LANDING_PAGE_ONLY', 'OTHER');
CREATE TYPE "WebsiteHosting" AS ENUM ('DD_SHARED', 'CLIENT_OWN');

-- CreateTable
CREATE TABLE "SmmReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "postType" "SmmPostType" NOT NULL,
    "platform" "SmmPlatform" NOT NULL,
    "platformOther" TEXT,
    "postUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "marketingType" "SmmMarketingType" NOT NULL,
    "followersGain" INTEGER,
    "profileReach" INTEGER,
    "postLikes" INTEGER,
    "profileVisits" INTEGER,
    "isPaidAd" BOOLEAN NOT NULL DEFAULT false,
    "paidAdSpend" DECIMAL(12,2),
    "paidFollowersGain" INTEGER,
    "paidLikes" INTEGER,
    "paidImpressions" INTEGER,
    "paidLeadsGenerated" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmmReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "backlinksCreated" INTEGER NOT NULL DEFAULT 0,
    "directorySubmissions" INTEGER NOT NULL DEFAULT 0,
    "articleSubmissions" INTEGER NOT NULL DEFAULT 0,
    "imageSubmissions" INTEGER NOT NULL DEFAULT 0,
    "profileCreations" INTEGER NOT NULL DEFAULT 0,
    "approvedLinks" INTEGER NOT NULL DEFAULT 0,
    "keywordRanking" TEXT,
    "serpRanking" TEXT,
    "trafficGain" INTEGER NOT NULL DEFAULT 0,
    "countryTraffic" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeoReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaidAdsReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "adGroup" TEXT,
    "adSet" TEXT,
    "objective" "PaidAdsObjective" NOT NULL,
    "setupDate" TIMESTAMP(3) NOT NULL,
    "dailyBudget" DECIMAL(12,2) NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reach" INTEGER,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "leads" INTEGER,
    "leadsConverted" INTEGER,
    "profileVisits" INTEGER,
    "addToCart" INTEGER,
    "revenueGeneratedPct" DECIMAL(5,2),
    "cpl" DECIMAL(12,2),
    "cpc" DECIMAL(12,2),
    "cpv" DECIMAL(12,2),
    "targetedCountries" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaidAdsReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GraphicDesignReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "designType" "GraphicDesignType" NOT NULL,
    "designTypeOther" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GraphicDesignReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentCreationReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "contentType" "ContentCreationType" NOT NULL,
    "contentTypeOther" TEXT,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentCreationReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteDevelopmentReportEntry" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "websiteType" "WebsiteType" NOT NULL,
    "websiteTypeOther" TEXT,
    "pageCount" INTEGER,
    "platformLanguage" TEXT,
    "adminCredentialNote" TEXT,
    "seoEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "domainPlatform" TEXT,
    "hosting" "WebsiteHosting",
    "websiteLink" TEXT,
    "maintenanceAgreed" BOOLEAN NOT NULL DEFAULT false,
    "executionDate" TIMESTAMP(3),
    "submissionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteDevelopmentReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmmReportEntry_clientServiceId_idx" ON "SmmReportEntry"("clientServiceId");
CREATE INDEX "SeoReportEntry_clientServiceId_idx" ON "SeoReportEntry"("clientServiceId");
CREATE INDEX "PaidAdsReportEntry_clientServiceId_idx" ON "PaidAdsReportEntry"("clientServiceId");
CREATE INDEX "GraphicDesignReportEntry_clientServiceId_idx" ON "GraphicDesignReportEntry"("clientServiceId");
CREATE INDEX "ContentCreationReportEntry_clientServiceId_idx" ON "ContentCreationReportEntry"("clientServiceId");
CREATE INDEX "WebsiteDevelopmentReportEntry_clientServiceId_idx" ON "WebsiteDevelopmentReportEntry"("clientServiceId");

-- AddForeignKey
ALTER TABLE "SmmReportEntry" ADD CONSTRAINT "SmmReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoReportEntry" ADD CONSTRAINT "SeoReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaidAdsReportEntry" ADD CONSTRAINT "PaidAdsReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GraphicDesignReportEntry" ADD CONSTRAINT "GraphicDesignReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentCreationReportEntry" ADD CONSTRAINT "ContentCreationReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteDevelopmentReportEntry" ADD CONSTRAINT "WebsiteDevelopmentReportEntry_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
