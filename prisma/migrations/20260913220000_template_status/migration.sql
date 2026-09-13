CREATE TYPE "TemplateStatus" AS ENUM ('draft', 'approved', 'rejected');
ALTER TABLE "CertificateTemplate" ADD COLUMN "status" "TemplateStatus" NOT NULL DEFAULT 'draft';
ALTER TABLE "CertificateTemplate" ADD COLUMN "reviewNote" TEXT;
