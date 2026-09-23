import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/generated/prisma/client";

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/cache/safe-cache", () => ({
  invalidateClubBranding: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    club: { findFirst: vi.fn(), create: vi.fn() },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { inviteClubAdmin, switchActingClub } from "@/lib/orgs/service";

describe("orgs service invite isolation", () => {
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

    const result = await inviteClubAdmin({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: "club-a",
      email: "da@test.local",
      supabaseId: "sid-new",
    });
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

    const result = await inviteClubAdmin({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: "club-a",
      email: "other@test.local",
      supabaseId: "sid-2",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/another district/i);
  });

  it("refuses club not in the caller's district", async () => {
    vi.mocked(prisma.club.findFirst).mockResolvedValue(null);
    const result = await inviteClubAdmin({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: "club-elsewhere",
      email: "admin@test.local",
      supabaseId: "sid-3",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found/i);
  });
});

describe("switchActingClub isolation", () => {
  beforeEach(() => {
    vi.mocked(prisma.club.findFirst).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it("switches a district admin to a club in their district", async () => {
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

    const result = await switchActingClub({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: "club-a",
    });
    expect(result.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "dist-admin-1" },
      data: { clubId: "club-a" },
    });
  });

  it("refuses a club in another district", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "dist-admin-1",
      role: UserRole.district_admin,
      districtId: "district-a",
      clubId: null,
    } as never);
    vi.mocked(prisma.club.findFirst).mockResolvedValue(null);

    const result = await switchActingClub({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: "club-elsewhere",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses a club admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "club-admin-1",
      role: UserRole.club_admin,
      districtId: "district-a",
      clubId: "club-a",
    } as never);

    const result = await switchActingClub({
      districtId: "district-a",
      actorUserId: "club-admin-1",
      clubId: "club-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/district admin/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("clears the acting club", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "dist-admin-1",
      role: UserRole.district_admin,
      districtId: "district-a",
      clubId: "club-a",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "dist-admin-1" } as never);

    const result = await switchActingClub({
      districtId: "district-a",
      actorUserId: "dist-admin-1",
      clubId: null,
    });
    expect(result.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "dist-admin-1" },
      data: { clubId: null },
    });
  });
});
