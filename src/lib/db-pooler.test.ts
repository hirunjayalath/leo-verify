import { describe, expect, it } from "vitest";
import {
  assertTenantDatabaseUrl,
  databaseRoleFromUrl,
  isDatabasePoolerUrl,
  isOwnerDatabaseRole,
} from "@/lib/db";

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

describe("runtime database roles", () => {
  it("reads the role before a pooler project suffix", () => {
    expect(
      databaseRoleFromUrl(
        "postgresql://leoverify_app.abc:pass@aws-0-x.pooler.supabase.com:6543/postgres",
      ),
    ).toBe("leoverify_app");
    expect(
      databaseRoleFromUrl(
        "postgresql://leoverify_service.abc:pass@aws-0-x.pooler.supabase.com:6543/postgres",
      ),
    ).toBe("leoverify_service");
    expect(
      databaseRoleFromUrl(
        "postgresql://postgres.abc:pass@aws-0-x.pooler.supabase.com:6543/postgres",
      ),
    ).toBe("postgres");
  });

  it("treats postgres and supabase_admin as owner roles", () => {
    expect(isOwnerDatabaseRole("postgres")).toBe(true);
    expect(isOwnerDatabaseRole("supabase_admin")).toBe(true);
    expect(isOwnerDatabaseRole("leoverify_app")).toBe(false);
  });

  it("rejects an owner or mismatched tenant URL", () => {
    expect(() =>
      assertTenantDatabaseUrl(
        "postgresql://postgres.abc:pass@host:6543/postgres",
        "leoverify_app",
      ),
    ).toThrow(/leoverify_app/);
    expect(() =>
      assertTenantDatabaseUrl(
        "postgresql://leoverify_service.abc:pass@host:6543/postgres",
        "leoverify_app",
      ),
    ).toThrow(/leoverify_app/);
    expect(
      assertTenantDatabaseUrl(
        "postgresql://leoverify_app.abc:pass@host:6543/postgres",
        "leoverify_app",
      ),
    ).toContain("leoverify_app");
  });
});
