import { describe, expect, it } from "vitest";
import { publicUrlForObjectKey } from "@/lib/storage/r2";

describe("publicUrlForObjectKey", () => {
  it("never exposes a public CDN URL for certificate PDFs", () => {
    expect(
      publicUrlForObjectKey(
        "certificates/club-1/abc.pdf",
        "https://cdn.example",
      ),
    ).toBeNull();
  });

  it("allows a public URL for logos and templates", () => {
    expect(
      publicUrlForObjectKey("logos/club-1/mark.png", "https://cdn.example"),
    ).toBe("https://cdn.example/logos/club-1/mark.png");
  });
});
