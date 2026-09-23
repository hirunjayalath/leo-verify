import { z } from "zod";

const hmacSecret = z
  .string()
  .min(32, "CERT_HMAC_SECRET must be at least 32 characters");

const optionalString = z.string().optional();

const developmentServerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  CERT_HMAC_SECRET: hmacSecret,
  CERT_HMAC_SECRET_PREVIOUS: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_NAME: optionalString,
  R2_PUBLIC_URL: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
});

const required = z.string().min(1);

const productionEnvSchema = z.object({
  DATABASE_URL: required,
  DIRECT_DATABASE_URL: required,
  SERVICE_DATABASE_URL: required,
  CERT_HMAC_SECRET: hmacSecret,
  CERT_HMAC_SECRET_PREVIOUS: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  SUPABASE_SERVICE_ROLE_KEY: required,
  NEXT_PUBLIC_APP_URL: z.string().url(),
  R2_ACCOUNT_ID: required,
  R2_ACCESS_KEY_ID: required,
  R2_SECRET_ACCESS_KEY: required,
  R2_BUCKET_NAME: required,
  R2_PUBLIC_URL: optionalString,
  RESEND_API_KEY: required,
  EMAIL_FROM: required,
  INNGEST_EVENT_KEY: required,
  INNGEST_SIGNING_KEY: required,
  UPSTASH_REDIS_REST_URL: required,
  UPSTASH_REDIS_REST_TOKEN: required,
  AUTH_DEV_BYPASS: z
    .string()
    .optional()
    .refine((value) => value !== "true", {
      message: "AUTH_DEV_BYPASS must not be true in production",
    }),
});

const developmentPublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const productionPublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof developmentServerEnvSchema>;
export type PublicEnv = z.infer<typeof developmentPublicEnvSchema>;
export type ProductionEnv = z.infer<typeof productionEnvSchema>;

function nonempty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

type EnvRecord = Record<string, string | undefined>;

/** True when this process must satisfy the production secret contract. */
export function isProductionEnvContract(
  env: EnvRecord = process.env,
): boolean {
  return Boolean(env.VERCEL || env.NODE_ENV === "production");
}

function readDevelopmentServerEnv(env: EnvRecord) {
  return {
    DATABASE_URL: nonempty(env.DATABASE_URL),
    CERT_HMAC_SECRET: env.CERT_HMAC_SECRET,
    CERT_HMAC_SECRET_PREVIOUS: nonempty(env.CERT_HMAC_SECRET_PREVIOUS),
    SUPABASE_SERVICE_ROLE_KEY: nonempty(env.SUPABASE_SERVICE_ROLE_KEY),
    R2_ACCOUNT_ID: nonempty(env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: nonempty(env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: nonempty(env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: nonempty(env.R2_BUCKET_NAME),
    R2_PUBLIC_URL: nonempty(env.R2_PUBLIC_URL),
    RESEND_API_KEY: nonempty(env.RESEND_API_KEY),
    EMAIL_FROM: nonempty(env.EMAIL_FROM),
  };
}

function readProductionEnv(env: EnvRecord) {
  return {
    DATABASE_URL: nonempty(env.DATABASE_URL),
    DIRECT_DATABASE_URL: nonempty(env.DIRECT_DATABASE_URL),
    SERVICE_DATABASE_URL: nonempty(env.SERVICE_DATABASE_URL),
    CERT_HMAC_SECRET: env.CERT_HMAC_SECRET,
    CERT_HMAC_SECRET_PREVIOUS: nonempty(env.CERT_HMAC_SECRET_PREVIOUS),
    NEXT_PUBLIC_SUPABASE_URL: nonempty(env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nonempty(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: nonempty(env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_APP_URL: nonempty(env.NEXT_PUBLIC_APP_URL),
    R2_ACCOUNT_ID: nonempty(env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: nonempty(env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: nonempty(env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: nonempty(env.R2_BUCKET_NAME),
    R2_PUBLIC_URL: nonempty(env.R2_PUBLIC_URL),
    RESEND_API_KEY: nonempty(env.RESEND_API_KEY),
    EMAIL_FROM: nonempty(env.EMAIL_FROM),
    INNGEST_EVENT_KEY: nonempty(env.INNGEST_EVENT_KEY),
    INNGEST_SIGNING_KEY: nonempty(env.INNGEST_SIGNING_KEY),
    UPSTASH_REDIS_REST_URL: nonempty(env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: nonempty(env.UPSTASH_REDIS_REST_TOKEN),
    AUTH_DEV_BYPASS: env.AUTH_DEV_BYPASS,
  };
}

function formatEnvIssues(issues: { path: PropertyKey[] }[]): string {
  const names = [
    ...new Set(
      issues
        .map((issue) => issue.path.join("."))
        .filter((name) => name.length > 0),
    ),
  ];
  return names.join(", ");
}

/**
 * Throws if production is missing a required secret.
 * Development and test env objects return immediately.
 * Names every missing or invalid key in one error.
 */
export function assertProductionEnv(
  env: EnvRecord = process.env,
): void {
  if (!isProductionEnvContract(env)) return;

  const parsed = productionEnvSchema.safeParse(readProductionEnv(env));
  if (parsed.success) return;

  throw new Error(
    `Invalid production environment: missing or invalid ${formatEnvIssues(parsed.error.issues)}`,
  );
}

let cachedServerEnv: ServerEnv | null = null;

/** Throws if CERT_HMAC_SECRET is missing or too short; production uses the full contract. */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  if (isProductionEnvContract()) {
    const parsed = productionEnvSchema.safeParse(readProductionEnv(process.env));
    if (!parsed.success) {
      throw new Error(
        `Invalid production environment: missing or invalid ${formatEnvIssues(parsed.error.issues)}`,
      );
    }
    cachedServerEnv = {
      DATABASE_URL: parsed.data.DATABASE_URL,
      CERT_HMAC_SECRET: parsed.data.CERT_HMAC_SECRET,
      CERT_HMAC_SECRET_PREVIOUS: parsed.data.CERT_HMAC_SECRET_PREVIOUS,
      SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
      R2_ACCOUNT_ID: parsed.data.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: parsed.data.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: parsed.data.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: parsed.data.R2_BUCKET_NAME,
      R2_PUBLIC_URL: parsed.data.R2_PUBLIC_URL,
      RESEND_API_KEY: parsed.data.RESEND_API_KEY,
      EMAIL_FROM: parsed.data.EMAIL_FROM,
    };
    return cachedServerEnv;
  }

  const parsed = developmentServerEnvSchema.safeParse(
    readDevelopmentServerEnv(process.env),
  );

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Reset cache — for tests only. */
export function resetServerEnvCache(): void {
  cachedServerEnv = null;
}

export function getPublicEnv(): PublicEnv {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: nonempty(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nonempty(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    NEXT_PUBLIC_APP_URL: nonempty(process.env.NEXT_PUBLIC_APP_URL),
  };

  if (isProductionEnvContract()) {
    return productionPublicEnvSchema.parse(raw);
  }

  return developmentPublicEnvSchema.parse(raw);
}
