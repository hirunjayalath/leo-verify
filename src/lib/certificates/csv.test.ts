import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  autoMapHeaders,
  validateCertificateCsv,
  validateCertificateXlsx,
  validateRosterRows,
} from "@/lib/certificates/csv";

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

  it("accepts custom headers via column mapping", () => {
    const records = [
      {
        "Full Name": "Ada Lovelace",
        "Work Email": "ada@example.com",
        Position: "Volunteer",
        Note: "Service",
      },
    ];
    const result = validateRosterRows(records, {
      recipientName: "Full Name",
      recipientEmail: "Work Email",
      role: "Position",
      achievement: "Note",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0]).toMatchObject({
        recipientName: "Ada Lovelace",
        recipientEmail: "ada@example.com",
        role: "Volunteer",
        achievement: "Service",
      });
    }
  });

  it("auto-maps known header aliases", () => {
    expect(autoMapHeaders(["Recipient Name", "Email", "Role"])).toEqual({
      recipientName: "Recipient Name",
      recipientEmail: "Email",
      role: "Role",
    });
  });

  it("validates an xlsx buffer from the first sheet", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "email", "role", "achievement"],
      ["Ada Lovelace", "ada@example.com", "Volunteer", "Service"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Roster");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const result = validateCertificateXlsx(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].recipientName).toBe("Ada Lovelace");
    }
  });
});
