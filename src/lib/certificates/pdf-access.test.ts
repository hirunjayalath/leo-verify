import { describe, expect, it } from "vitest";
import {
  canAccessCertificatePdf,
  certificateAboutText,
  recipientClaimLoginPath,
} from "@/lib/certificates/pdf-access";

describe("canAccessCertificatePdf", () => {
  const base = {
    recipientEmail: "ada@test.local",
    clubId: "club-a",
  };

  it("allows the matching recipient", () => {
    expect(
      canAccessCertificatePdf({
        ...base,
        authEmail: "Ada@test.local",
      }),
    ).toEqual({ ok: true, via: "recipient" });
  });

  it("allows a club admin of the same club", () => {
    expect(
      canAccessCertificatePdf({
        ...base,
        admin: { role: "club_admin", clubId: "club-a" },
      }),
    ).toEqual({ ok: true, via: "admin" });
  });

  it("denies another club admin", () => {
    expect(
      canAccessCertificatePdf({
        ...base,
        authEmail: "admin@other.local",
        admin: { role: "club_admin", clubId: "club-b" },
      }),
    ).toEqual({ ok: false, reason: "forbidden" });
  });

  it("requires a session when nobody is signed in", () => {
    expect(canAccessCertificatePdf(base)).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("allows a recipient who already passed the RLS ownership check", () => {
    expect(
      canAccessCertificatePdf({
        clubId: "club-a",
        authEmail: "ada@test.local",
        recipientOwns: true,
      }),
    ).toEqual({ ok: true, via: "recipient" });
  });
});

describe("certificateAboutText", () => {
  it("builds a paste-ready About blurb", () => {
    expect(
      certificateAboutText({
        recipientName: "Ada",
        eventName: "Leadership Lab",
        role: "Participant",
        checkUrl: "https://app.example/v/LEO-1?t=abc",
      }),
    ).toContain("Leadership Lab");
  });
});

describe("recipientClaimLoginPath", () => {
  it("sends downloaders to claim after login", () => {
    expect(recipientClaimLoginPath()).toBe("/login?next=/claim");
  });
});
