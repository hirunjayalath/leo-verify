-- AlterTable
ALTER TABLE "CertificateTemplate" ADD COLUMN IF NOT EXISTS "pageSize" TEXT NOT NULL DEFAULT 'a4_landscape';
