import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rlsStore = new AsyncLocalStorage<PrismaClient>();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaService: PrismaClient | undefined;
  pgPool: Pool | undefined;
  pgServicePool: Pool | undefined;
};

function poolMax() {
  return Math.min(
    8,
    Math.max(1, Number(process.env.PG_POOL_MAX || 3) || 3),
  );
}

/** Interactive transactions cannot run concurrent queries on one connection. */
function serializePrisma(tx: PrismaClient): PrismaClient {
  let tail = Promise.resolve();

  function enqueue<T>(work: () => Promise<T> | T): Promise<T> {
    const run = tail.then(work, work);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run as Promise<T>;
  }

  function wrap(value: unknown, owner: object): unknown {
    if (typeof value === "function") {
      return (...args: unknown[]) =>
        enqueue(() => (value as (...inner: unknown[]) => unknown).apply(owner, args));
    }
    if (value && typeof value === "object") {
      return new Proxy(value as object, {
        get(model, prop, receiver) {
          return wrap(Reflect.get(model, prop, receiver), model as object);
        },
      });
    }
    return value;
  }

  return new Proxy(tx, {
    get(target, prop, receiver) {
      return wrap(Reflect.get(target, prop, receiver), target);
    },
  }) as PrismaClient;
}

function createPrismaClient(connectionString: string, cacheKey: "app" | "service") {
  const poolKey = cacheKey === "app" ? "pgPool" : "pgServicePool";
  const pool =
    globalForPrisma[poolKey] ??
    new Pool({
      connectionString,
      max: poolMax(),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  globalForPrisma[poolKey] = pool;
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return connectionString;
}

function getAppClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(requireDatabaseUrl(), "app");
  }
  return globalForPrisma.prisma;
}

function getServiceClient(): PrismaClient {
  if (globalForPrisma.prismaService) return globalForPrisma.prismaService;
  const url =
    process.env.SERVICE_DATABASE_URL?.trim() ||
    (process.env.NODE_ENV === "production" || process.env.VERCEL
      ? ""
      : process.env.DATABASE_URL);
  if (!url) {
    throw new Error("SERVICE_DATABASE_URL is not set");
  }
  globalForPrisma.prismaService = createPrismaClient(url, "service");
  return globalForPrisma.prismaService;
}

/** Tenant-scoped Prisma. Inside withRlsContext this is the transaction client. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = rlsStore.getStore() ?? getAppClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Public verify, portals, signup bootstrap. Narrow service-role policies. */
export const prismaService = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getServiceClient();
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
    await prismaService.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export type RlsContextOptions = {
  recipientEmail?: string | null;
};

/**
 * SET LOCAL app.current_supabase_id (and optional recipient email) for RLS.
 * Nested prisma.* calls use this transaction via AsyncLocalStorage.
 */
export async function withRlsContext<T>(
  supabaseId: string,
  fn: (tx: PrismaClient) => Promise<T>,
  options: RlsContextOptions = {},
): Promise<T> {
  const existing = rlsStore.getStore();
  if (existing) {
    await existing.$executeRaw`SELECT set_config('app.current_supabase_id', ${supabaseId}, true)`;
    if (options.recipientEmail) {
      await existing.$executeRaw`SELECT set_config('app.current_recipient_email', ${options.recipientEmail.toLowerCase()}, true)`;
    }
    return fn(existing);
  }

  return getAppClient().$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_supabase_id', ${supabaseId}, true)`;
      if (options.recipientEmail) {
        await tx.$executeRaw`SELECT set_config('app.current_recipient_email', ${options.recipientEmail.toLowerCase()}, true)`;
      }
      const client = serializePrisma(tx as unknown as PrismaClient);
      return rlsStore.run(client, () => fn(client));
    },
    { maxWait: 8_000, timeout: 20_000 },
  );
}
