/**
 * Lightweight ops logging + optional Sentry.
 * Never log verification tokens, HMAC secrets, or PII beyond clubId/jobId/uniqueId.
 */

type OpsContext = Record<string, string | number | boolean | null | undefined>;

export function logOps(event: string, context: OpsContext = {}): void {
  const safe = Object.fromEntries(
    Object.entries(context).filter(
      ([key]) =>
        !/token|secret|password|authorization|cookie/i.test(key),
    ),
  );
  console.info(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}

export async function captureException(
  error: unknown,
  context: OpsContext = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  logOps("error", { ...context, message });

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic import keeps Sentry optional until the package is installed.
    const Sentry = await import("@sentry/nextjs").catch(() => null);
    if (!Sentry) {
      console.error("[sentry-unavailable]", message, context);
      return;
    }
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      extra: context,
    });
  } catch {
    console.error("[sentry-failed]", message);
  }
}
