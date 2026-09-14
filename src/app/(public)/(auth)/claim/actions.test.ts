import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAuthUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSupabaseAuthUser: (...args: unknown[]) => getSupabaseAuthUser(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    recipient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    certificate: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  claimCertificatesAction,
  updateProfileVisibilityAction,
} from "@/app/(public)/(auth)/claim/actions";

describe("claim + profile auth gates", () => {
  beforeEach(() => {
    getSupabaseAuthUser.mockReset();
  });

  it("rejects claim without a Supabase session", async () => {
    getSupabaseAuthUser.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("email", "person@test.local");
    formData.set("name", "Person");

    const result = await claimCertificatesAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sign in/i);
    }
  });

  it("rejects claim when form email does not match session", async () => {
    getSupabaseAuthUser.mockResolvedValue({
      id: "auth-1",
      email: "signed-in@test.local",
    });
    const formData = new FormData();
    formData.set("email", "other@test.local");
    formData.set("name", "Other");

    const result = await claimCertificatesAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/same email/i);
    }
  });

  it("rejects profile visibility update without a session", async () => {
    getSupabaseAuthUser.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("publicProfile", "on");

    const result = await updateProfileVisibilityAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sign in/i);
    }
  });
});
