import { describe, expect, it } from "vitest";
import { validateCertificateCsv } from "@/lib/certificates/csv";

describe("CSV validation (Rule 6)", () => {
  it("accepts a valid roster", () => {
    const csv = `name,email,role,achievement
Ada Lovelace,ada@example.com,Volunteer,Service
Grace Hopper,grace@example.com,Organizer,`;
    const result = validateCertificateCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].recipientName).toBe("Ada Lovelace");
    }
  });

  it("rejects bad rows before any commit", () => {
    const csv = `name,email,role
,not-an-email,Volunteer`;
    const result = validateCertificateCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
