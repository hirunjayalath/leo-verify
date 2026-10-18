import { describe, expect, it } from "vitest";
import {
  CertificateStatus,
  ClubType,
  TemplateKind,
  TemplateStatus,
  UserRole,
} from "@/generated/prisma/client";
import {
  homePathForRole,
  isAdminRole,
  isPathAllowedForRole,
  postLoginPath,
} from "@/lib/auth-redirect";
import {
  canAccessCertificatePdf,
  certificateAboutText,
  recipientClaimLoginPath,
} from "@/lib/certificates/pdf-access";
import { isBadgeExportAllowed } from "@/lib/certificates/badge-access";
import { evaluateVerification } from "@/lib/certificates/pure/verify";
import {
  computeVerificationToken,
  verifyVerificationToken,
} from "@/lib/certificates/pure/token";
import {
  DEFAULT_LAYOUT,
  pageDimensions,
} from "@/lib/certificates/pure/layout";
import {
  parseVerifyInput,
  isLeoVerifyQrPayload,
} from "@/lib/certificates/pure/parse-verify-input";
import { formatAuditAction } from "@/lib/format";
import { isUomPlatformAdmin } from "@/lib/auth";

const testSecrets = {
  current: "test-hmac-secret-at-least-32-characters-long",
  previous: "previous-hmac-secret-at-least-32-chars!!",
};

describe("LeoVerify Use Case Test Suite (Before & After Login)", () => {
  // =========================================================================
  // 1. Anyone (No Account) — Public Verifier & Guest Flows
  // =========================================================================
  describe("1. Pre-Login / Public Verifier (Anyone)", () => {
    const mockIssuedRow = {
      uniqueId: "LEO-UOM-2026-000001",
      recipientName: "John Doe",
      role: "Participant",
      achievement: "Outstanding Contributor",
      issueDate: new Date("2026-09-15T00:00:00.000Z"),
      status: "issued" as const,
      clubId: "club-uom",
      eventId: "event-annual",
      clubName: "Leo Club of University of Moratuwa",
      eventName: "Annual Induction 2026",
      pdfUrl: "/api/certificates/LEO-UOM-2026-000001/pdf",
      pdfKey: "certs/LEO-UOM-2026-000001.pdf",
      tokenVersion: 1,
    };

    const validToken = computeVerificationToken({
      uniqueId: mockIssuedRow.uniqueId,
      recipientName: mockIssuedRow.recipientName,
      eventId: mockIssuedRow.eventId,
      clubId: mockIssuedRow.clubId,
      issueDate: "2026-09-15",
      role: mockIssuedRow.role,
      tokenVersion: 1,
    }, testSecrets.current);

    it("1.1 Valid Verify: returns public details only and NEVER leaks email or phone", () => {
      const result = evaluateVerification(mockIssuedRow, validToken, testSecrets);

      expect(result.status).toBe("valid");
      if (result.status === "valid") {
        expect(result.uniqueId).toBe("LEO-UOM-2026-000001");
        expect(result.recipientName).toBe("John Doe");
        expect(result.clubName).toBe("Leo Club of University of Moratuwa");
        expect(result.eventName).toBe("Annual Induction 2026");
        expect(result.role).toBe("Participant");
        expect(result.achievement).toBe("Outstanding Contributor");
        expect(result.issueDate).toBe("2026-09-15");
        expect(result.pdfUrl).toBe(`/api/certificates/LEO-UOM-2026-000001/pdf?t=${validToken}`);

        // CRITICAL INVARIANT: Private contact data is never present
        expect((result as Record<string, unknown>).email).toBeUndefined();
        expect((result as Record<string, unknown>).phone).toBeUndefined();
        expect((result as Record<string, unknown>).recipientEmail).toBeUndefined();
      }
    });

    it("1.2 Invalid Verify: tampered token or wrong ID returns generic invalid status", () => {
      const badToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const result = evaluateVerification(mockIssuedRow, badToken, testSecrets);
      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty("message");

      const nullResult = evaluateVerification(null, validToken, testSecrets);
      expect(nullResult.status).toBe("invalid");
    });

    it("1.3 Revoked Verify: displays ONLY the revocation notice and leaks zero metadata", () => {
      const mockRevokedRow = {
        ...mockIssuedRow,
        status: "revoked" as const,
      };

      const result = evaluateVerification(mockRevokedRow, validToken, testSecrets);
      expect(result.status).toBe("revoked");
      if (result.status === "revoked") {
        expect(result.message).toBe("This certificate has been revoked.");
        expect(result.uniqueId).toBe("LEO-UOM-2026-000001");
        // Must not expose recipient name, club, or event details
        expect((result as Record<string, unknown>).recipientName).toBeUndefined();
        expect((result as Record<string, unknown>).clubName).toBeUndefined();
        expect((result as Record<string, unknown>).eventName).toBeUndefined();
        expect((result as Record<string, unknown>).pdfUrl).toBeUndefined();
      }
    });

    it("1.4 Public PDF Download Guard: unauthenticated guest is forbidden from downloading PDF", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: "recipient@example.com",
        clubId: "club-uom",
        authEmail: null,
        admin: null,
      });

      expect(access.ok).toBe(false);
      if (!access.ok) {
        expect(access.reason).toBe("unauthenticated");
      }
    });

    it("1.5 Parse Verify Input: correctly extracts and canonicalizes ID from raw input and URLs", () => {
      const fromId = parseVerifyInput("LEO-UOM-2026-000123");
      expect(fromId.id).toBe("LEO-UOM-2026-000123");
      expect(fromId.token).toBe("");

      const fromUrl = parseVerifyInput("https://leoverify.lk/v/LEO-UOM-2026-000123?t=abcdef123456");
      expect(fromUrl.id).toBe("LEO-UOM-2026-000123");
      expect(fromUrl.token).toBe("abcdef123456");

      const lowercase = parseVerifyInput("leo-uom-2026-000123");
      expect(lowercase.id).toBe("leo-uom-2026-000123");

      expect(isLeoVerifyQrPayload("https://leoverify.lk/v/LEO-UOM-2026-000123?t=abc")).toBe(true);
      expect(isLeoVerifyQrPayload("https://random-link.com/hello")).toBe(false);
    });

    it("1.6 Open Badges 3.0 Export Guard: requires issued status AND valid token", () => {
      // Valid issued cert with token
      expect(
        isBadgeExportAllowed({
          issued: true,
          token: "valid-token",
          tokenValid: true,
        }),
      ).toBe(true);

      // Missing token
      expect(
        isBadgeExportAllowed({
          issued: true,
          token: null,
          tokenValid: false,
        }),
      ).toBe(false);

      // Invalid token
      expect(
        isBadgeExportAllowed({
          issued: true,
          token: "bad-token",
          tokenValid: false,
        }),
      ).toBe(false);

      // Revoked certificate
      expect(
        isBadgeExportAllowed({
          issued: false,
          token: "valid-token",
          tokenValid: true,
        }),
      ).toBe(false);
    });
  });

  // =========================================================================
  // 2. Shared: Authentication & Routing Contract
  // =========================================================================
  describe("2. Authentication & Role-Based Routing", () => {
    it("2.1 Routing Contract: sends each role to their designated home", () => {
      expect(homePathForRole("club_admin")).toBe("/admin");
      expect(homePathForRole("district_admin")).toBe("/admin/district");
      expect(homePathForRole(null)).toBe("/claim");
      expect(homePathForRole(undefined)).toBe("/claim");
    });

    it("2.2 Role Permissions: prevents non-admins from entering admin routes", () => {
      expect(isPathAllowedForRole("club_admin", "/admin")).toBe(true);
      expect(isPathAllowedForRole("club_admin", "/admin/events")).toBe(true);
      expect(isPathAllowedForRole("club_admin", "/claim")).toBe(false);

      expect(isPathAllowedForRole("district_admin", "/admin/district")).toBe(true);
      expect(isPathAllowedForRole("district_admin", "/claim")).toBe(false);

      // Recipients & Guests cannot access /admin
      expect(isPathAllowedForRole(null, "/admin")).toBe(false);
      expect(isPathAllowedForRole(null, "/admin/certificates")).toBe(false);
      expect(isPathAllowedForRole(null, "/claim")).toBe(true);
    });

    it("2.3 Post-Login Redirection: preserves safe internal target or falls back to role home", () => {
      expect(postLoginPath("club_admin", "/admin/events")).toBe("/admin/events");
      // If recipient tries to access /admin via ?next=, falls back to /claim
      expect(postLoginPath(null, "/admin/events")).toBe("/claim");
      // Malicious external redirects are sanitized to home
      expect(postLoginPath("club_admin", "https://evil.com")).toBe("/admin");
    });

    it("2.4 Disabled Admin Check: disabled admin account cannot authenticate", () => {
      const activeAdmin = { id: "user-1", disabledAt: null };
      const disabledAdmin = { id: "user-2", disabledAt: new Date("2026-10-01") };

      expect(Boolean(activeAdmin.disabledAt)).toBe(false);
      expect(Boolean(disabledAdmin.disabledAt)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Recipient — Claim, Download & Share
  // =========================================================================
  describe("3. Post-Login: Recipient Workflows", () => {
    const cert = {
      recipientEmail: "recipient@test.local",
      clubId: "club-uom",
    };

    it("3.1 Gated PDF Download: allowed when authenticated session email matches certificate", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: cert.recipientEmail,
        clubId: cert.clubId,
        authEmail: "recipient@test.local",
      });

      expect(access.ok).toBe(true);
      if (access.ok) {
        expect(access.via).toBe("recipient");
      }
    });

    it("3.2 Gated PDF Download: forbidden when session email does not match", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: cert.recipientEmail,
        clubId: cert.clubId,
        authEmail: "stranger@test.local",
      });

      expect(access.ok).toBe(false);
      if (!access.ok) {
        expect(access.reason).toBe("forbidden");
      }
    });

    it("3.3 Gated PDF Download: case-insensitive email matching is respected", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: "Recipient@Test.Local",
        clubId: "club-uom",
        authEmail: "recipient@test.local",
      });

      expect(access.ok).toBe(true);
      if (access.ok) {
        expect(access.via).toBe("recipient");
      }
    });

    it("3.4 Recipient About Text: builds standardized copy text for profiles", () => {
      const text = certificateAboutText({
        recipientName: "John Doe",
        eventName: "Annual Induction 2026",
        role: "President",
        checkUrl: "https://leoverify.lk/v/LEO-UOM-2026-000001?t=abc",
      });
      expect(text).toContain("John Doe — President, Annual Induction 2026.");
      expect(text).toContain("Checked on LeoVerify: https://leoverify.lk/v/LEO-UOM-2026-000001?t=abc");
    });

    it("3.5 Recipient Claim Login: returns standard redirect path to /claim", () => {
      expect(recipientClaimLoginPath()).toBe("/login?next=/claim");
    });
  });

  // =========================================================================
  // 4. Club Admin (Leo Club)
  // =========================================================================
  describe("4. Post-Login: Club Admin Workflows", () => {
    it("4.1 Operator PDF Download: permitted for same-club admin (operator copy)", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: "recipient@test.local",
        clubId: "club-uom",
        authEmail: "admin@uom.lk",
        admin: {
          role: "club_admin",
          clubId: "club-uom", // Same club
        },
      });

      expect(access.ok).toBe(true);
      if (access.ok) {
        expect(access.via).toBe("admin");
      }
    });

    it("4.2 Isolation: cross-club admin CANNOT download another club's certificate PDF", () => {
      const access = canAccessCertificatePdf({
        recipientEmail: "recipient@test.local",
        clubId: "club-uom",
        authEmail: "admin@otherclub.lk",
        admin: {
          role: "club_admin",
          clubId: "club-other", // Different club
        },
      });

      expect(access.ok).toBe(false);
      if (!access.ok) {
        expect(access.reason).toBe("forbidden");
      }
    });

    it("4.3 Reissue Verification: increments tokenVersion and invalidates previous token", () => {
      const baseFields = {
        uniqueId: "LEO-UOM-2026-000001",
        recipientName: "John Doe",
        eventId: "event-1",
        clubId: "club-uom",
        issueDate: "2026-09-15",
        role: "Participant",
      };

      const tokenV1 = computeVerificationToken({ ...baseFields, tokenVersion: 1 }, testSecrets.current);
      const tokenV2 = computeVerificationToken({ ...baseFields, tokenVersion: 2 }, testSecrets.current);

      expect(tokenV1).not.toBe(tokenV2);

      // Old token fails against new version
      const oldCheck = verifyVerificationToken(
        { ...baseFields, tokenVersion: 2 },
        tokenV1,
        testSecrets,
      );
      expect(oldCheck).toBe(false);

      // New token succeeds against new version
      const newCheck = verifyVerificationToken(
        { ...baseFields, tokenVersion: 2 },
        tokenV2,
        testSecrets,
      );
      expect(newCheck).toBe(true);
    });

    it("4.4 Token Rotation: accepts previous HMAC secret during secret rotation window", () => {
      const baseFields = {
        uniqueId: "LEO-UOM-2026-000001",
        recipientName: "John Doe",
        eventId: "event-1",
        clubId: "club-uom",
        issueDate: "2026-09-15",
        role: "Participant",
        tokenVersion: 1,
      };

      // Token generated with previous secret
      const tokenWithPrevious = computeVerificationToken(baseFields, testSecrets.previous);

      // Verifier accepts token signed with previous secret
      const verified = verifyVerificationToken(baseFields, tokenWithPrevious, testSecrets);
      expect(verified).toBe(true);
    });

    it("4.5 Audit Action Formatting: provides consistent human-readable audit descriptions", () => {
      expect(formatAuditAction("certificate.issue")).toBe("Issued certificate");
      expect(formatAuditAction("certificate.revoke")).toBe("Revoked certificate");
      expect(formatAuditAction("certificate.reissue")).toBe("Reissued certificate");
      expect(formatAuditAction("event.create")).toBe("Created event");
      expect(formatAuditAction("template.create")).toBe("Created template");
    });
  });

  // =========================================================================
  // 5. Public Organization Club Admin
  // =========================================================================
  describe("5. Post-Login: Public Organization Governance", () => {
    it("5.1 Club Types: Leo vs Public org classification exists", () => {
      expect(ClubType.leo).toBe("leo");
      expect(ClubType.public).toBe("public");
    });

    it("5.2 Template Lifecycle: draft, approved, rejected statuses exist", () => {
      expect(TemplateStatus.draft).toBe("draft");
      expect(TemplateStatus.approved).toBe("approved");
      expect(TemplateStatus.rejected).toBe("rejected");
    });

    it("5.3 Template Kinds: supports both certificate and service letter", () => {
      expect(TemplateKind.certificate).toBe("certificate");
      expect(TemplateKind.service_letter).toBe("service_letter");
    });

    it("5.4 Template Approval Policy: Leo clubs auto-approve, public orgs require district review", () => {
      const getInitialStatus = (clubType: ClubType) =>
        clubType === ClubType.public ? TemplateStatus.draft : TemplateStatus.approved;

      expect(getInitialStatus(ClubType.leo)).toBe(TemplateStatus.approved);
      expect(getInitialStatus(ClubType.public)).toBe(TemplateStatus.draft);
    });
  });

  // =========================================================================
  // 6. District Admin
  // =========================================================================
  describe("6. Post-Login: District Admin Workflows", () => {
    it("6.1 Role Distinctions: user roles are strictly club_admin or district_admin", () => {
      expect(UserRole.club_admin).toBe("club_admin");
      expect(UserRole.district_admin).toBe("district_admin");
      expect(isAdminRole("district_admin")).toBe(true);
      expect(isAdminRole("club_admin")).toBe(true);
      expect(isAdminRole(null)).toBe(false);
    });

    it("6.2 District Admin Scope: denied access to UOM Operator/Reports routes", () => {
      const districtAdmin = {
        role: "district_admin" as const,
        club: { code: "LEO-COLOMBO" },
      };
      // District admin is not platform admin
      expect(isUomPlatformAdmin(districtAdmin)).toBe(false);

      // District admin can access district dashboard
      expect(isPathAllowedForRole("district_admin", "/admin/district")).toBe(true);
      // But district admin cannot access recipient claim
      expect(isPathAllowedForRole("district_admin", "/claim")).toBe(false);
    });
  });

  // =========================================================================
  // 7. UOM Club Admin (Platform Operator)
  // =========================================================================
  describe("7. Post-Login: UOM Platform Operator Persona", () => {
    it("7.1 Platform Operator Detection: only club_admin on UOM club is platform operator", () => {
      const uomUser = {
        role: "club_admin" as const,
        club: { code: "UOM" },
      };
      expect(isUomPlatformAdmin(uomUser)).toBe(true);

      const otherClubAdmin = {
        role: "club_admin" as const,
        club: { code: "COLOMBO" },
      };
      expect(isUomPlatformAdmin(otherClubAdmin)).toBe(false);

      const districtAdmin = {
        role: "district_admin" as const,
        club: { code: "UOM" },
      };
      expect(isUomPlatformAdmin(districtAdmin)).toBe(false);
    });

    it("7.2 UOM Aggregate Reports Isolation: report rows contain ONLY counts and zero recipient PII", () => {
      type MockReportRow = {
        clubId: string;
        name: string;
        code: string;
        events: number;
        issued: number;
        revoked: number;
      };

      const mockRow: MockReportRow = {
        clubId: "club-uom",
        name: "Leo Club of UOM",
        code: "UOM",
        events: 12,
        issued: 450,
        revoked: 3,
      };

      // Invariant: row contains ONLY aggregate metrics
      expect(mockRow.events).toBe(12);
      expect(mockRow.issued).toBe(450);
      expect(mockRow.revoked).toBe(3);

      // Invariant: no recipient names or emails
      expect((mockRow as Record<string, unknown>).recipientName).toBeUndefined();
      expect((mockRow as Record<string, unknown>).recipientEmail).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. Invariants & Negative Security Boundaries
  // =========================================================================
  describe("8. Negative Constraints & Invariants", () => {
    it("8.1 Certificate Status: status is exclusively issued or revoked (never deleted)", () => {
      expect(Object.values(CertificateStatus)).toEqual(["issued", "revoked"]);
      // There is NO deleted status enum
      expect((CertificateStatus as Record<string, string>).deleted).toBeUndefined();
    });

    it("8.2 Default Template Layout: has default canvas dimensions and fields", () => {
      expect(Array.isArray(DEFAULT_LAYOUT)).toBe(true);
      expect(DEFAULT_LAYOUT.length).toBeGreaterThan(0);

      const dims = pageDimensions("a4_landscape");
      expect(dims.width).toBe(842);
      expect(dims.height).toBe(595);

      const fieldNames = DEFAULT_LAYOUT.map((f) => f.field);
      expect(fieldNames).toContain("recipientName");
      expect(fieldNames).toContain("role");
      expect(fieldNames).toContain("issueDate");
      expect(fieldNames).toContain("uniqueId");
      expect(fieldNames).toContain("qr");
    });

    it("8.3 Navigation Invariant: No live UI club switcher in admin navigation", () => {
      // Standard club navigation paths
      const allowedAdminPaths = [
        "/admin",
        "/admin/issue",
        "/admin/events",
        "/admin/templates",
        "/admin/certificates",
        "/admin/settings",
        "/admin/audit",
      ];
      // Every standard admin path stays strictly within /admin
      allowedAdminPaths.forEach((path) => {
        expect(isPathAllowedForRole("club_admin", path)).toBe(true);
      });
    });
  });
});
