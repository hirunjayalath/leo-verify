export type ActionResult<
  T extends Record<string, unknown> = Record<string, never>,
> = ({ ok: true } & T) | { ok: false; error: string };

export function ok<T extends Record<string, unknown> = Record<string, never>>(
  data?: T,
): { ok: true } & T {
  return { ok: true, ...(data ?? {}) } as { ok: true } & T;
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}
