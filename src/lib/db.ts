import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/** App uses DATABASE_URL (pooler :6543 on Vercel); migrate uses DIRECT_DATABASE_URL. */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // One connection per serverless isolate — never widen on Vercel.
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

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    globalForPrisma.prisma = client;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** True when DATABASE_URL is the Supabase transaction pooler (port 6543 or pgbouncer=true). */
export function isDatabasePoolerUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /pgbouncer=true/i.test(url) || /:6543(?:[/?]|$)/.test(url);
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
