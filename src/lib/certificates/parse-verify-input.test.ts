import { describe, expect, it } from "vitest";
import {
  isLeoVerifyQrPayload,
  parseVerifyInput,
} from "@/lib/certificates/parse-verify-input";

describe("parseVerifyInput", () => {
  it("parses a full verify URL with token", () => {
    expect(
      parseVerifyInput(
        "https://leoverify.org/v/LEO-UOM-2026-000123?t=abc123deadbeef",
      ),
    ).toEqual({
      id: "LEO-UOM-2026-000123",
      token: "abc123deadbeef",
    });
  });

  it("parses a relative path", () => {
    expect(parseVerifyInput("/v/LEO-UOM-2026-000001?t=tok")).toEqual({
      id: "LEO-UOM-2026-000001",
      token: "tok",
    });
  });

  it("treats a bare ID as id without token", () => {
    expect(parseVerifyInput("LEO-UOM-2026-000123")).toEqual({
      id: "LEO-UOM-2026-000123",
      token: "",
    });
  });

  it("ignores non-verify URLs (no /v/ path)", () => {
    expect(parseVerifyInput("https://evil.example/not-verify?t=x")).toEqual({
      id: "https://evil.example/not-verify?t=x",
      token: "",
    });
  });
});

describe("isLeoVerifyQrPayload", () => {
  it("accepts LeoVerify verify URLs", () => {
    expect(
      isLeoVerifyQrPayload("https://app.example/v/LEO-UOM-2026-1?t=aa"),
    ).toBe(true);
  });

  it("rejects unrelated URLs", () => {
    expect(isLeoVerifyQrPayload("https://example.com/other")).toBe(false);
  });
});
