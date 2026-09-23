import { describe, expect, it } from "vitest";
import {
  formatAuditAction,
  formatAuditTarget,
  formatCheckedAt,
} from "@/lib/format";

describe("formatAuditTarget", () => {
  it("prefers uniqueId over name", () => {
    expect(
      formatAuditTarget("Certificate", {
        uniqueId: "LEO-UOM-2026-000001",
        name: "QA Smoke",
      }),
    ).toBe("LEO-UOM-2026-000001");
  });

  it("uses name when uniqueId is missing", () => {
    expect(formatAuditTarget("Event", { name: "QA Smoke 2026-09-23" })).toBe(
      "QA Smoke 2026-09-23",
    );
  });

  it("uses slug when uniqueId and name are missing", () => {
    expect(formatAuditTarget("Club", { slug: "uom-leo" })).toBe("uom-leo");
  });

  it("prefers name over slug", () => {
    expect(
      formatAuditTarget("Club", {
        name: "Leo Club of University of Moratuwa",
        slug: "uom-leo",
      }),
    ).toBe("Leo Club of University of Moratuwa");
  });

  it("falls back to the target type", () => {
    expect(formatAuditTarget("Certificate")).toBe("Certificate");
    expect(formatAuditTarget("Certificate", { reason: "typo" })).toBe(
      "Certificate",
    );
    expect(formatAuditTarget("Event", null)).toBe("Event");
  });
});

describe("formatAuditAction", () => {
  it("labels club branding updates", () => {
    expect(formatAuditAction("club.branding.update")).toBe(
      "Updated club branding",
    );
  });
});

describe("formatCheckedAt", () => {
  it("formats a fixed locale and Asia/Colombo timezone", () => {
    expect(formatCheckedAt("2026-09-23T10:45:00.000Z")).toBe(
      "23 Sept 2026, 16:15",
    );
  });
});
