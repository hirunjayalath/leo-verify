import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return { url, anonKey };
}

export function parseCookieHeader(
  header: string | null,
): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").flatMap((part) => {
    const trimmed = part.trim();
    if (!trimmed) return [];
    const eq = trimmed.indexOf("=");
    if (eq === -1) return [{ name: trimmed, value: "" }];
    return [{ name: trimmed.slice(0, eq), value: trimmed.slice(eq + 1) }];
  });
}

export async function createServerSupabaseClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}

/** Route handlers: read the Cookie header so PDF/API calls see the same session as RSC. */
export function createRouteSupabaseClient(request: Request) {
  const { url, anonKey } = supabaseEnv();
  const parsed = parseCookieHeader(request.headers.get("cookie"));
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parsed;
      },
      setAll() {
        // Response cookie refresh is not required to authorize a download.
      },
    },
  });
}
