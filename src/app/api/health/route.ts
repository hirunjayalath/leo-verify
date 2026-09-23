import { NextResponse } from "next/server";
import { isDatabasePoolerUrl, pingDatabase } from "@/lib/db";
import { pingR2 } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const started = Date.now();
  const [db, r2] = await Promise.all([pingDatabase(), pingR2()]);
  const ok = db;
  const body = {
    ok,
    db,
    r2,
    dbPooler: isDatabasePoolerUrl(process.env.DATABASE_URL),
    upstashConfigured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN,
    ),
    durationMs: Date.now() - started,
    ts: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
