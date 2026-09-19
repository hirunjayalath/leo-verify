import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/**
 * Prefer DATABASE_URL (transaction pooler on Vercel: port 6543 + pgbouncer=true).
 * Use DIRECT_DATABASE_URL only for migrations (session / direct 5432).
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Serverless: one (or two) connections per isolate. Never open a large pool on Vercel.
  const max = Math.min(
    2,
    Math.max(1, Number(process.env.PG_POOL_MAX || 1) || 1),
  );

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });

  // Cache pool in all environments so hot serverless isolates reuse connections.
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/**
 * Lazy Prisma singleton. Requires DATABASE_URL and a generated client.
 * Public verification and admin routes should use this server-side only.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    globalForPrisma.prisma = client;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Lightweight connectivity check for /api/health */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
