export type ActionResult<T extends Record<string, unknown> | undefined = undefined> =
  | (undefined extends T ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

export function ok(): { ok: true };
export function ok<T extends Record<string, unknown>>(data: T): { ok: true } & T;
export function ok<T extends Record<string, unknown>>(
  data?: T,
): { ok: true } | ({ ok: true } & T) {
  return { ok: true, ...(data ?? {}) } as { ok: true } & T;
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
