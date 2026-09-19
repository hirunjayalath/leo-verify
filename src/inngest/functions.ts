import { processImportJobFn } from "@/inngest/jobs/import";
import { sendCertificateEmailFn } from "@/inngest/jobs/email";

export { inngest } from "@/inngest/client";
export { processImportJob } from "@/inngest/jobs/import";

export const functions = [processImportJobFn, sendCertificateEmailFn];
