import { describe, expect, it } from "vitest";
import {
  isSpreadsheetFile,
  parseColumnMapping,
} from "@/lib/certificates/import-service";

describe("parseColumnMapping", () => {
  it("parses valid roster field keys", () => {
    const mapping = parseColumnMapping(
      JSON.stringify({
        recipientName: "Full Name",
        recipientEmail: "Email",
        role: "Role",
        achievement: "Award",
        ignored: "x",
      }),
    );
    expect(mapping).toEqual({
      recipientName: "Full Name",
      recipientEmail: "Email",
      role: "Role",
      achievement: "Award",
    });
  });

  it("returns undefined for empty or invalid input", () => {
    expect(parseColumnMapping(null)).toBeUndefined();
    expect(parseColumnMapping("")).toBeUndefined();
    expect(parseColumnMapping("not-json")).toBeUndefined();
    expect(parseColumnMapping("{}")).toBeUndefined();
  });
});

describe("isSpreadsheetFile", () => {
  it("accepts csv and xlsx by extension", () => {
    expect(
      isSpreadsheetFile(new File([], "roster.csv", { type: "text/csv" })),
    ).toBe(true);
    expect(
      isSpreadsheetFile(
        new File([], "roster.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ),
    ).toBe(true);
  });

  it("rejects non-spreadsheet files", () => {
    expect(
      isSpreadsheetFile(new File([], "notes.txt", { type: "text/plain" })),
    ).toBe(false);
  });
});
