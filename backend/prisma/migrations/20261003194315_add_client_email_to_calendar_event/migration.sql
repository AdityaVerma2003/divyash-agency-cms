-- Ad-hoc client contact email for an online calendar meeting (optional,
-- not tied to a registered Client row).
ALTER TABLE "CalendarEvent" ADD COLUMN "clientEmail" TEXT;
