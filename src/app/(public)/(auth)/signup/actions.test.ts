import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAuthUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSupabaseAuthUser: (...args: unknown[]) => getSupabaseAuthUser(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));

vi.mock("@/lib/rate-limit", () => ({
  clientIpFromHeaders: () => "203.0.113.9",
  rateLimitSignup: async () => ({ success: true, remaining: 9 }),
}));

vi.mock("@/lib/db", () => ({
  prismaService: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    district: {
      upsert: vi.fn(),
    },
    club: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { prismaService } from "@/lib/db";
import { signupPublicOrgAction } from "@/app/(public)/(auth)/signup/actions";

describe("signupPublicOrgAction security", () => {
  beforeEach(() => {
    getSupabaseAuthUser.mockReset();
    vi.mocked(prismaService.user.findUnique).mockReset();
    vi.mocked(prismaService.user.create).mockReset();
    vi.mocked(prismaService.club.findUnique).mockReset();
    vi.mocked(prismaService.club.create).mockReset();
    vi.mocked(prismaService.district.upsert).mockReset();
  });

  it("rejects unauthenticated signup", async () => {
    getSupabaseAuthUser.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("orgName", "Acme");
    formData.set("orgCode", "ACME");
    formData.set("adminName", "Admin");
    const result = await signupPublicOrgAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sign in/i);
  });

  it("refuses to overwrite an existing User by email", async () => {
    getSupabaseAuthUser.mockResolvedValue({
      id: "auth-new",
      email: "admin@uom.leoverify.local",
    });
    vi.mocked(prismaService.user.findUnique).mockImplementation((async (args: {
      where: { email?: string; supabaseId?: string };
    }) => {
      if (args.where.email) {
        return {
          id: "existing",
          email: "admin@uom.leoverify.local",
          role: "club_admin",
        };
      }
      return null;
    }) as never);

    const formData = new FormData();
    formData.set("orgName", "Evil Org");
    formData.set("orgCode", "EVIL");
    formData.set("adminName", "Attacker");
    const result = await signupPublicOrgAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already exists/i);
    expect(prismaService.user.create).not.toHaveBeenCalled();
  });
});
