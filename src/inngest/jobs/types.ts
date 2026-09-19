export type CertificateEmailPayload = {
  to: string;
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  clubLogoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  jobId?: string;
  clubId?: string;
};
