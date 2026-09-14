import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireDistrictAdmin: async () => ({
    id: "dist-admin-1",
    districtId: "district-a",
    role: "district_admin",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    club: { findFirst: vi.fn() },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { UserRole } from "@/generated/prisma/client";
import { inviteClubAdminAction } from "@/app/(admin)/admin/district/actions";
import { prisma } from "@/lib/db";

describe("inviteClubAdminAction tenancy", () => {
  beforeEach(() => {
    vi.mocked(prisma.club.findFirst).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
    vi.mocked(prisma.user.update).mockReset();
    vi.mocked(prisma.club.findFirst).mockResolvedValue({
      id: "club-a",
      districtId: "district-a",
    } as never);
  });

  it("refuses to demote a district_admin", async () => {
    vi.mocked(prisma.user.findUnique).mockImplementation((async (args: {
      where: { email?: string; supabaseId?: string };
    }) => {
      if (args.where.email) {
        return {
          id: "u1",
          email: "da@test.local",
          role: UserRole.district_admin,
          districtId: "district-b",
          supabaseId: "sid-1",
        };
      }
      return null;
    }) as never);

    const formData = new FormData();
    formData.set("clubId", "club-a");
    formData.set("email", "da@test.local");
    formData.set("supabaseId", "sid-new");
    const result = await inviteClubAdminAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/district admin/i);
  });

  it("refuses users from another district", async () => {
    vi.mocked(prisma.user.findUnique).mockImplementation((async (args: {
      where: { email?: string; supabaseId?: string };
    }) => {
      if (args.where.email) {
        return {
          id: "u2",
          email: "other@test.local",
          role: UserRole.club_admin,
          districtId: "district-b",
          supabaseId: "sid-2",
          name: "Other",
        };
      }
      return null;
    }) as never);

    const formData = new FormData();
    formData.set("clubId", "club-a");
    formData.set("email", "other@test.local");
    formData.set("supabaseId", "sid-2");
    const result = await inviteClubAdminAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/another district/i);
  });
});
