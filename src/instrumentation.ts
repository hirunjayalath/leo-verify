import * as Sentry from "@sentry/nextjs";
import { assertProductionEnv } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertProductionEnv();
    const { assertRuntimeDatabaseRoles } = await import("@/lib/db");
    await assertRuntimeDatabaseRoles();
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
