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
      create: vi.fn(),
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

import { prisma } from "@/lib/db";
import {
  claimCertificatesAction,
  updateProfileVisibilityAction,
} from "@/app/(public)/(auth)/claim/actions";

describe("claim + profile auth gates", () => {
  beforeEach(() => {
    getSupabaseAuthUser.mockReset();
    vi.mocked(prisma.recipient.findUnique).mockReset();
    vi.mocked(prisma.recipient.findFirst).mockReset();
    vi.mocked(prisma.recipient.create).mockReset();
    vi.mocked(prisma.recipient.update).mockReset();
    vi.mocked(prisma.certificate.updateMany).mockReset();
    vi.mocked(prisma.certificate.findMany).mockReset();
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

  it("rejects claim that would steal an already-bound supabaseId", async () => {
    getSupabaseAuthUser.mockResolvedValue({
      id: "attacker-auth",
      email: "person@test.local",
    });
    vi.mocked(prisma.recipient.findUnique).mockResolvedValue({
      id: "rec-1",
      email: "person@test.local",
      supabaseId: "owner-auth",
      slug: "person",
      publicProfile: false,
    } as never);

    const formData = new FormData();
    formData.set("email", "person@test.local");
    formData.set("name", "Person");

    const result = await claimCertificatesAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already claimed/i);
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
