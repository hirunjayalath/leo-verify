import { beforeEach, describe, expect, it, vi } from "vitest";

const districtUser = {
  id: "dist-admin-1",
  districtId: "district-a",
  role: "district_admin",
  supabaseId: "dist-admin-supabase",
};

vi.mock("@/lib/auth", () => ({
  requireDistrictAdmin: async () => districtUser,
  asDistrictAdmin: async (fn: (user: typeof districtUser) => Promise<unknown>) =>
    fn(districtUser),
}));

vi.mock("@/lib/supabase/admin", () => ({
  inviteOrFindAuthUser: vi.fn(async (email: string) => ({
    id: "sid-from-invite",
    email,
    invited: true,
  })),
}));

vi.mock("@/lib/email/resend", () => ({
  sendClubAdminAssignedEmail: vi.fn(),
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
import {
  inviteClubAdminAction,
  switchActingClubAction,
} from "@/app/(admin)/admin/district/actions";
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
    const result = await inviteClubAdminAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/another district/i);
  });
});

describe("switchActingClubAction tenancy", () => {
  beforeEach(() => {
    vi.mocked(prisma.club.findFirst).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it("switches to a club in the district", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "dist-admin-1",
      role: UserRole.district_admin,
      districtId: "district-a",
      clubId: null,
    } as never);
    vi.mocked(prisma.club.findFirst).mockResolvedValue({
      id: "club-a",
      districtId: "district-a",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "dist-admin-1" } as never);

    const formData = new FormData();
    formData.set("clubId", "club-a");
    const result = await switchActingClubAction(formData);
    expect(result.ok).toBe(true);
  });

  it("refuses a club outside the district", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "dist-admin-1",
      role: UserRole.district_admin,
      districtId: "district-a",
      clubId: null,
    } as never);
    vi.mocked(prisma.club.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("clubId", "club-elsewhere");
    const result = await switchActingClubAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found/i);
  });
});
