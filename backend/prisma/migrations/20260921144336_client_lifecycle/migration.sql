-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedBy" TEXT,
ADD COLUMN     "suspensionNotes" TEXT,
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "ClientService" ADD COLUMN     "contractDurationMonths" INTEGER,
ADD COLUMN     "pauseNotes" TEXT,
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedBy" TEXT;
