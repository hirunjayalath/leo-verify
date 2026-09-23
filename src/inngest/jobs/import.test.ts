import { describe, expect, it } from "vitest";
import { ImportRowStatus } from "@/generated/prisma/client";
import {
  EMAIL_EVENT_CHUNK,
  IMPORT_BATCH_SIZE,
  IMPORT_PDF_CONCURRENCY,
  chunkItems,
  countersFromRowGroups,
} from "@/inngest/jobs/import";

describe("import batch helpers", () => {
  it("keeps cheap batch and PDF concurrency caps", () => {
    expect(IMPORT_BATCH_SIZE).toBe(20);
    expect(IMPORT_PDF_CONCURRENCY).toBe(1);
    expect(EMAIL_EVENT_CHUNK).toBe(25);
  });

  it("recomputes job counters from row statuses", () => {
    expect(
      countersFromRowGroups([
        { status: ImportRowStatus.issued, _count: { _all: 12 } },
        { status: ImportRowStatus.skipped, _count: { _all: 3 } },
        { status: ImportRowStatus.failed, _count: { _all: 1 } },
        { status: ImportRowStatus.pending, _count: { _all: 4 } },
      ]),
    ).toEqual({ successRows: 12, failedRows: 1, skippedRows: 3 });
  });

  it("chunks emails so Inngest sends stay small", () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    expect(chunkItems(items, EMAIL_EVENT_CHUNK)).toEqual([
      items.slice(0, 25),
      items.slice(25, 50),
      items.slice(50),
    ]);
  });
});
