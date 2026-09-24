import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { continueHref } from "@/lib/auth-redirect";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  // Never honor AUTH_DEV_BYPASS on Vercel.
  if (
    process.env.AUTH_DEV_BYPASS === "true" &&
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    !process.env.VERCEL_ENV
  ) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isAdminPath) {
      const login = new URL("/login", request.url);
      login.searchParams.set(
        "next",
        safeInternalPath(request.nextUrl.pathname, "/admin"),
      );
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "next",
      safeInternalPath(request.nextUrl.pathname, "/admin"),
    );
    return NextResponse.redirect(login);
  }

  // AAL2 required for /admin except enrollment.
  const isMfaPath = request.nextUrl.pathname === "/admin/mfa";
  if (isAdminPath && user && !isMfaPath) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.currentLevel !== "aal2") {
      return NextResponse.redirect(new URL("/admin/mfa", request.url));
    }
  }

  if (request.nextUrl.pathname === "/login" && user) {
    // Recovery hash stays on the client — do not bounce away.
    const type = request.nextUrl.searchParams.get("type");
    if (type === "recovery") {
      return response;
    }
    return NextResponse.redirect(
      new URL(continueHref(request.nextUrl.searchParams.get("next")), request.url),
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
