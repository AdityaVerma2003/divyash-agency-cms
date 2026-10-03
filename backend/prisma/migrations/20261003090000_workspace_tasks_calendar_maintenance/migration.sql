-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SMM', 'SEO', 'PAID_ADS', 'DESIGN', 'CONTENT', 'WEB_DEV');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETE');
CREATE TYPE "TaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable: team member report-type permissions
ALTER TABLE "User" ADD COLUMN "reportTypes" "ReportType"[] DEFAULT ARRAY[]::"ReportType"[];

-- ─────────────────────────────────────────────────────────────────────────
-- Report entry provenance + scoping.
-- clientId is added nullable, backfilled from ClientService, then made NOT
-- NULL. createdById stays nullable: existing rows predate authorship
-- tracking and inventing an author would be wrong.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "SmmReportEntry"                ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "notes" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "SeoReportEntry"                ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "notes" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "PaidAdsReportEntry"            ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "notes" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "GraphicDesignReportEntry"      ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "ContentCreationReportEntry"    ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "WebsiteDevelopmentReportEntry" ADD COLUMN "clientId" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "notes" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill clientId via the owning ClientService
UPDATE "SmmReportEntry"                e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";
UPDATE "SeoReportEntry"                e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";
UPDATE "PaidAdsReportEntry"            e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";
UPDATE "GraphicDesignReportEntry"      e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";
UPDATE "ContentCreationReportEntry"    e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";
UPDATE "WebsiteDevelopmentReportEntry" e SET "clientId" = cs."clientId" FROM "ClientService" cs WHERE cs."id" = e."clientServiceId";

-- Backfill updatedAt from createdAt so the column can be NOT NULL
UPDATE "SmmReportEntry"                SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "SeoReportEntry"                SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "PaidAdsReportEntry"            SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "GraphicDesignReportEntry"      SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "ContentCreationReportEntry"    SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "WebsiteDevelopmentReportEntry" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Enforce NOT NULL now that every row has values
ALTER TABLE "SmmReportEntry"                ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "SeoReportEntry"                ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "PaidAdsReportEntry"            ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "GraphicDesignReportEntry"      ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "ContentCreationReportEntry"    ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "WebsiteDevelopmentReportEntry" ALTER COLUMN "clientId" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "SmmReportEntry_clientId_idx"                ON "SmmReportEntry"("clientId");
CREATE INDEX "SeoReportEntry_clientId_idx"                ON "SeoReportEntry"("clientId");
CREATE INDEX "PaidAdsReportEntry_clientId_idx"            ON "PaidAdsReportEntry"("clientId");
CREATE INDEX "GraphicDesignReportEntry_clientId_idx"      ON "GraphicDesignReportEntry"("clientId");
CREATE INDEX "ContentCreationReportEntry_clientId_idx"    ON "ContentCreationReportEntry"("clientId");
CREATE INDEX "WebsiteDevelopmentReportEntry_clientId_idx" ON "WebsiteDevelopmentReportEntry"("clientId");

-- Site credentials are now stored as AES-256-GCM ciphertext
ALTER TABLE "WebsiteDevelopmentReportEntry" RENAME COLUMN "adminCredentialNote" TO "adminCredentialEnc";

-- CreateTable: month lock
CREATE TABLE "ReportMonthLock" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "month" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT NOT NULL,
    CONSTRAINT "ReportMonthLock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReportMonthLock_clientId_month_key" ON "ReportMonthLock"("clientId", "month");

-- CreateTable: tasks
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Task_status_idx"   ON "Task"("status");
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaskAssignee_taskId_userId_key" ON "TaskAssignee"("taskId", "userId");
CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");

CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");

-- CreateTable: calendar
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "mode" "EventMode" NOT NULL DEFAULT 'OFFLINE',
    "location" TEXT,
    "meetingUrl" TEXT,
    "colorTag" TEXT,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarEvent_startAt_idx"  ON "CalendarEvent"("startAt");
CREATE INDEX "CalendarEvent_clientId_idx" ON "CalendarEvent"("clientId");

CREATE TABLE "CalendarEventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CalendarEventAttendee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarEventAttendee_eventId_userId_key" ON "CalendarEventAttendee"("eventId", "userId");
CREATE INDEX "CalendarEventAttendee_userId_idx" ON "CalendarEventAttendee"("userId");

-- CreateTable: site settings (single row)
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "maintenanceStartedAt" TIMESTAMP(3),
    "maintenanceEndsAt" TIMESTAMP(3),
    "reportLockDayOfMonth" INTEGER NOT NULL DEFAULT 5,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
INSERT INTO "SiteSetting" ("id", "updatedAt") VALUES ('singleton', CURRENT_TIMESTAMP);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarEventAttendee" ADD CONSTRAINT "CalendarEventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventAttendee" ADD CONSTRAINT "CalendarEventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
