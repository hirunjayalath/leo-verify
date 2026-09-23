import { describe, expect, it } from "vitest";
import {
  EMAIL_EVENT_CHUNK,
  IMPORT_BATCH_SIZE,
  IMPORT_PDF_CONCURRENCY,
  chunkItems,
} from "@/inngest/jobs/import";

describe("import batch helpers", () => {
  it("keeps cheap batch and PDF concurrency caps", () => {
    expect(IMPORT_BATCH_SIZE).toBe(20);
    expect(IMPORT_PDF_CONCURRENCY).toBe(2);
    expect(EMAIL_EVENT_CHUNK).toBe(25);
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
