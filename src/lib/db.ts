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
  roleAssert: Promise<void> | undefined;
};

function poolMax() {
  return Math.min(
    8,
    Math.max(1, Number(process.env.PG_POOL_MAX || 3) || 3),
  );
}

export function databaseRoleFromUrl(url: string): string {
  const username = decodeURIComponent(new URL(url).username);
  return username.split(".")[0] ?? "";
}

export function isOwnerDatabaseRole(role: string): boolean {
  return role === "postgres" || role === "supabase_admin";
}

export function assertTenantDatabaseUrl(
  url: string | undefined,
  expected: "leoverify_app" | "leoverify_service",
): string {
  const label =
    expected === "leoverify_app" ? "DATABASE_URL" : "SERVICE_DATABASE_URL";
  if (!url?.trim()) {
    throw new Error(`${label} is not set`);
  }
  const role = databaseRoleFromUrl(url);
  if (isOwnerDatabaseRole(role) || role !== expected) {
    throw new Error(
      `${label} must use role ${expected} (got ${role || "unknown"}). The owner URL is not a supported runtime mode — use DIRECT_DATABASE_URL for migrate and seed.`,
    );
  }
  return url;
}

function createPrismaClient(connectionString: string, cacheKey: "app" | "service") {
  const poolKey = cacheKey === "app" ? "pgPool" : "pgServicePool";
  const pool =
    globalForPrisma[poolKey] ??
    new Pool({
      connectionString,
      max: poolMax(),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
    });
  globalForPrisma[poolKey] = pool;
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function skipRuntimeRoleAssert(): boolean {
  return Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
}

function startRuntimeRoleAssert() {
  if (skipRuntimeRoleAssert() || !process.env.DATABASE_URL) return;
  if (globalForPrisma.roleAssert) return;
  globalForPrisma.roleAssert = (async () => {
    await assertConnectedRole(getAppClient(), "leoverify_app");
    await assertConnectedRole(getServiceClient(), "leoverify_service");
  })();
}

function getAppClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const url = assertTenantDatabaseUrl(process.env.DATABASE_URL, "leoverify_app");
    globalForPrisma.prisma = createPrismaClient(url, "app");
    startRuntimeRoleAssert();
  }
  return globalForPrisma.prisma;
}

function getServiceClient(): PrismaClient {
  if (globalForPrisma.prismaService) return globalForPrisma.prismaService;
  const url = assertTenantDatabaseUrl(
    process.env.SERVICE_DATABASE_URL,
    "leoverify_service",
  );
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

export function ownerDatabaseUrl(): string | undefined {
  return process.env.DIRECT_DATABASE_URL?.trim() || undefined;
}

async function assertConnectedRole(
  client: PrismaClient,
  expected: "leoverify_app" | "leoverify_service",
): Promise<void> {
  const rows = await client.$queryRaw<
    { current_user: string; rolbypassrls: boolean }[]
  >`SELECT current_user, r.rolbypassrls
    FROM pg_roles r
    WHERE r.rolname = current_user`;
  const row = rows[0];
  const role = row?.current_user?.split(".")[0] ?? "";
  if (!row || isOwnerDatabaseRole(role) || row.rolbypassrls || role !== expected) {
    throw new Error(
      `Runtime database role must be ${expected} without BYPASSRLS (got ${row?.current_user ?? "unknown"}).`,
    );
  }
}

/** Connects and rejects owner / BYPASSRLS roles. Safe to call at boot. */
export async function assertRuntimeDatabaseRoles(): Promise<void> {
  startRuntimeRoleAssert();
  await globalForPrisma.roleAssert;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await prismaService.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export function isInRlsContext(): boolean {
  return Boolean(rlsStore.getStore());
}

/** Issue/import I/O must not run inside an open RLS transaction. */
export function assertNotInRlsContext(label: string): void {
  if (isInRlsContext()) {
    throw new Error(`${label} must not run inside withRlsContext`);
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
      const client = tx as unknown as PrismaClient;
      return rlsStore.run(client, () => fn(client));
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
}
