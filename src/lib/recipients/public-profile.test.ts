import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prismaService: {
    recipient: {
      findUnique: vi.fn(),
    },
  },
}));

import { prismaService } from "@/lib/db";
import { getPublicProfileShareCard } from "@/lib/recipients/public-profile";

describe("getPublicProfileShareCard", () => {
  beforeEach(() => {
    vi.mocked(prismaService.recipient.findUnique).mockReset();
  });

  it("returns null when the profile is not public", async () => {
    vi.mocked(prismaService.recipient.findUnique).mockResolvedValue({
      name: "Hidden",
      publicProfile: false,
      _count: { certificates: 3 },
    } as never);

    await expect(getPublicProfileShareCard("hidden-person")).resolves.toBeNull();
  });

  it("returns null when the slug is missing", async () => {
    vi.mocked(prismaService.recipient.findUnique).mockResolvedValue(null);
    await expect(getPublicProfileShareCard("missing")).resolves.toBeNull();
  });

  it("returns name and listed certificate count for a public profile", async () => {
    vi.mocked(prismaService.recipient.findUnique).mockResolvedValue({
      name: "Ada",
      publicProfile: true,
      _count: { certificates: 2 },
    } as never);

    await expect(getPublicProfileShareCard("ada")).resolves.toEqual({
      name: "Ada",
      certCount: 2,
    });
  });
});
