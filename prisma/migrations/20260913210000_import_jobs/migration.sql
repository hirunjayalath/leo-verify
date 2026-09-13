-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('pending', 'validating', 'running', 'completed', 'failed');
CREATE TYPE "ImportRowStatus" AS ENUM ('pending', 'issued', 'skipped', 'failed');

CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJobRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "role" TEXT NOT NULL,
    "achievement" TEXT,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportJob_clubId_idx" ON "ImportJob"("clubId");
CREATE INDEX "ImportJob_eventId_idx" ON "ImportJob"("eventId");
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");
CREATE UNIQUE INDEX "ImportJobRow_jobId_rowNumber_key" ON "ImportJobRow"("jobId", "rowNumber");
CREATE INDEX "ImportJobRow_jobId_status_idx" ON "ImportJobRow"("jobId", "status");
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
