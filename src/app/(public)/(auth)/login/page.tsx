"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { safeInternalPath } from "@/lib/safe-redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setLoading(false);
      toast.error("Supabase is not configured in .env");
      return;
    }

    try {
      const { createBrowserSupabaseClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Signed in");
      router.push(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above first");
      return;
    }
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      toast.error("Supabase is not configured in .env");
      return;
    }
    setResetting(true);
    try {
      const { createBrowserSupabaseClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${(process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent if that account exists");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
              onClick={onForgotPassword}
              disabled={resetting}
            >
              {resetting ? "Sending…" : "Forgot password?"}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Spinner />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Need an account? Contact your club admin for access.
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to public site
        </Link>
      </p>
    </>
  );
}

function LoginFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Club admin login"
      description="Sign in with your LeoVerify club account. Enable MFA in Supabase Auth for production admins."
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
