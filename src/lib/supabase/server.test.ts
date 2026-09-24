import { describe, expect, it } from "vitest";
import { parseCookieHeader } from "@/lib/supabase/server";

describe("parseCookieHeader", () => {
  it("splits name/value pairs without decoding base64 padding", () => {
    expect(
      parseCookieHeader("sb-access-token=base64-abc=; theme=dark"),
    ).toEqual([
      { name: "sb-access-token", value: "base64-abc=" },
      { name: "theme", value: "dark" },
    ]);
  });

  it("returns an empty list when the header is missing", () => {
    expect(parseCookieHeader(null)).toEqual([]);
  });
});
