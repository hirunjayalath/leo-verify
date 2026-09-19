import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClubType, TemplateStatus } from "@/generated/prisma/client";

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/certificates/image-sniff", () => ({
  sniffImageBytes: () => ({
    ok: true as const,
    ext: "png",
    contentType: "image/png",
  }),
}));

vi.mock("@/lib/storage/r2", () => ({
  buildObjectKey: () => "templates/club-a/x.png",
  uploadObject: async () => ({
    key: "templates/club-a/x.png",
    url: "https://cdn.example/x.png",
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    club: { findUniqueOrThrow: vi.fn() },
    certificateTemplate: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { createTemplate } from "@/lib/templates/service";

function pngFile(name = "bg.png"): File {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return new File([bytes], name, { type: "image/png" });
}

describe("templates service", () => {
  beforeEach(() => {
    vi.mocked(prisma.event.findFirst).mockReset();
    vi.mocked(prisma.club.findUniqueOrThrow).mockReset();
    vi.mocked(prisma.certificateTemplate.create).mockReset();
  });

  it("rejects create when event is not in the club", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    const result = await createTemplate({
      clubId: "club-a",
      actorUserId: "user-1",
      eventId: "event-other",
      name: "Volunteer cert",
      background: pngFile(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/event not found/i);
    expect(prisma.certificateTemplate.create).not.toHaveBeenCalled();
  });

  it("creates public-org templates as draft", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: "event-1",
      clubId: "club-a",
    } as never);
    vi.mocked(prisma.club.findUniqueOrThrow).mockResolvedValue({
      id: "club-a",
      type: ClubType.public,
    } as never);
    vi.mocked(prisma.certificateTemplate.create).mockResolvedValue({
      id: "tmpl-1",
    } as never);

    const result = await createTemplate({
      clubId: "club-a",
      actorUserId: "user-1",
      eventId: "event-1",
      name: "Volunteer cert",
      background: pngFile(),
    });

    expect(result.ok).toBe(true);
    expect(prisma.certificateTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: "club-a",
          eventId: "event-1",
          status: TemplateStatus.draft,
        }),
      }),
    );
  });

  it("auto-approves Leo club templates", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: "event-1",
      clubId: "club-leo",
    } as never);
    vi.mocked(prisma.club.findUniqueOrThrow).mockResolvedValue({
      id: "club-leo",
      type: ClubType.leo,
    } as never);
    vi.mocked(prisma.certificateTemplate.create).mockResolvedValue({
      id: "tmpl-2",
    } as never);

    const result = await createTemplate({
      clubId: "club-leo",
      actorUserId: "user-1",
      eventId: "event-1",
      name: "Leo cert",
      background: pngFile(),
    });

    expect(result.ok).toBe(true);
    expect(prisma.certificateTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TemplateStatus.approved,
        }),
      }),
    );
  });
});
