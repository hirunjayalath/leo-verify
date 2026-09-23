import { describe, expect, it } from "vitest";
import { isDatabasePoolerUrl } from "@/lib/db";

describe("isDatabasePoolerUrl", () => {
  it("detects pgbouncer and port 6543", () => {
    expect(
      isDatabasePoolerUrl(
        "postgresql://x:y@aws-0-x.pooler.supabase.com:6543/postgres?pgbouncer=true",
      ),
    ).toBe(true);
    expect(
      isDatabasePoolerUrl(
        "postgresql://x:y@aws-0-x.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(true);
  });

  it("rejects a direct session URL", () => {
    expect(
      isDatabasePoolerUrl(
        "postgresql://postgres:pass@db.project.supabase.co:5432/postgres",
      ),
    ).toBe(false);
    expect(isDatabasePoolerUrl(undefined)).toBe(false);
  });
});
