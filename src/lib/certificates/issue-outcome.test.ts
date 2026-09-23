import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  assertNotInRlsContext: vi.fn(),
  withRlsContext: async (
    _id: string,
    fn: (tx: { label: string }) => Promise<unknown>,
  ) => fn({ label: "tx" }),
}));

vi.mock("@/lib/certificates/issue-core", () => ({
  createCertificateRecord: vi.fn(),
  auditCertificateIssue: vi.fn(),
  attachCertificatePdf: vi.fn(),
  commitReissue: vi.fn(),
  prepareReissue: vi.fn(),
  revokeCertificateRecord: vi.fn(),
}));

vi.mock("@/lib/certificates/issue-pdf", () => ({
  renderAndUploadCertificatePdf: vi.fn(),
  deleteCertificatePdfObject: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendCertificateEmail: vi.fn(),
}));

import {
  attachCertificatePdf,
  createCertificateRecord,
} from "@/lib/certificates/issue-core";
import { renderAndUploadCertificatePdf } from "@/lib/certificates/issue-pdf";
import { sendCertificateEmail } from "@/lib/email/resend";
import { issueCertificate } from "@/lib/certificates/issue";

const issuedRecord = {
  skipped: false as const,
  certificate: {
    id: "cert-1",
    uniqueId: "LEO-TST-2026-000001",
    verificationToken: "token",
    recipientName: "Ada",
    recipientEmail: "ada@test.local",
    role: "Volunteer",
    achievement: null,
  },
  uniqueId: "LEO-TST-2026-000001",
  verificationToken: "token",
  issueDateIso: "2026-01-01",
  template: {},
  club: {
    id: "club-1",
    name: "Club",
    logoUrl: null,
    primaryColor: "#323232",
    accentColor: "#38a3e3",
    code: "TST",
  },
  event: { id: "event-1", name: "Event" },
};

const baseInput = {
  eventId: "event-1",
  clubId: "club-1",
  actorUserId: "user-1",
  actorSupabaseId: "auth-1",
  recipientName: "Ada",
  recipientEmail: "ada@test.local",
  role: "Volunteer",
};

describe("issueCertificate outcomes", () => {
  beforeEach(() => {
    vi.mocked(createCertificateRecord).mockReset();
    vi.mocked(attachCertificatePdf).mockReset();
    vi.mocked(renderAndUploadCertificatePdf).mockReset();
    vi.mocked(sendCertificateEmail).mockReset();
    vi.mocked(sendCertificateEmail).mockResolvedValue({ sent: true });
  });

  it("does not email when PDF attach fails", async () => {
    const onRecordCreated = vi.fn();
    vi.mocked(createCertificateRecord).mockResolvedValue(issuedRecord as never);
    vi.mocked(renderAndUploadCertificatePdf).mockRejectedValue(
      new Error("r2 unavailable"),
    );

    const result = await issueCertificate({ ...baseInput, onRecordCreated });

    expect(result.pdfAttachFailed).toBe(true);
    expect(result.pdfUrl).toBeNull();
    expect(result.emailSent).toBe(false);
    expect(sendCertificateEmail).not.toHaveBeenCalled();
    expect(onRecordCreated).toHaveBeenCalledWith(
      { label: "tx" },
      { kind: "issued", certificateId: "cert-1" },
    );
  });

  it("records issued vs skipped in the same create transaction", async () => {
    const onRecordCreated = vi.fn();
    vi.mocked(createCertificateRecord).mockResolvedValue({
      skipped: true,
      result: {
        id: "cert-existing",
        uniqueId: "LEO-TST-2026-000001",
        verificationToken: "token",
        pdfUrl: null,
        skipped: true,
      },
    });

    const skipped = await issueCertificate({
      ...baseInput,
      onRecordCreated,
    });
    expect(skipped.skipped).toBe(true);
    expect(onRecordCreated).toHaveBeenCalledWith(
      { label: "tx" },
      { kind: "skipped", certificateId: "cert-existing" },
    );

    onRecordCreated.mockReset();
    vi.mocked(createCertificateRecord).mockResolvedValue(issuedRecord as never);
    vi.mocked(renderAndUploadCertificatePdf).mockResolvedValue({
      key: "pdfs/cert-1.pdf",
      url: "/api/certificates/LEO-TST-2026-000001/pdf?t=token",
    });

    const issued = await issueCertificate({
      ...baseInput,
      sendEmail: false,
      onRecordCreated,
    });
    expect(issued.pdfAttachFailed).toBeUndefined();
    expect(onRecordCreated).toHaveBeenCalledWith(
      { label: "tx" },
      { kind: "issued", certificateId: "cert-1" },
    );
  });
});
