"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/public/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { continueHref } from "@/lib/auth-redirect";

type AuthMode = "signin" | "signup" | "recovery";

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashType(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("type");
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  autoFocus,
  extra,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  extra?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="Password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          className="pr-11"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((open) => !open)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueTo = continueHref(searchParams.get("next"));
  const hashType = useSyncExternalStore(subscribeHash, getHashType, () => null);
  const recovery =
    searchParams.get("type") === "recovery" || hashType === "recovery";
  const [accountMode, setAccountMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const mode: AuthMode = recovery ? "recovery" : accountMode;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

      if (mode === "recovery") {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        toast.success("Password updated. You are signed in.");
        router.push(continueTo);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        const redirectTo = `${(process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")}/continue`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        toast.success("Account created. Check your email if you need to confirm it.");
        router.push(continueTo);
        router.refresh();
        return;
      }

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
      router.push(continueTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
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
      const redirectTo = `${(process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")}/login?type=recovery`;
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

  const title =
    mode === "recovery"
      ? "Choose a new password"
      : mode === "signup"
        ? "Create recipient account"
        : "Sign in";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode !== "recovery" && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@club.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}
        <PasswordField
          id="password"
          label={mode === "recovery" ? "New password" : "Password"}
          autoComplete={
            mode === "signup" ? "new-password" : "current-password"
          }
          value={password}
          onChange={setPassword}
          autoFocus={mode === "recovery"}
          extra={
            mode === "signin" ? (
              <button
                type="button"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline disabled:opacity-50"
                onClick={onForgotPassword}
                disabled={resetting}
              >
                {resetting ? "Sending…" : "Forgot password?"}
              </button>
            ) : undefined
          }
        />
        {(mode === "signup" || mode === "recovery") && (
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        )}
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading && <Spinner />}
          {loading
            ? mode === "recovery"
              ? "Updating…"
              : mode === "signup"
                ? "Creating…"
                : "Signing in…"
            : mode === "recovery"
              ? "Update password"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
        </Button>
      </form>

      {mode === "signin" && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Certificate holder?{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-4 hover:underline"
            onClick={() => setAccountMode("signup")}
          >
            Create a recipient account
          </button>
        </p>
      )}
      {mode === "signup" && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setAccountMode("signin")}
          >
            Sign in
          </button>
        </p>
      )}
      {mode === "recovery" && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          After updating, you can claim certificates with this email.
        </p>
      )}
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
      {/* Keep title in sync for screen readers via visually tied copy */}
      <span className="sr-only">{title}</span>
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
      title="Sign in"
      description="Club admins and certificate holders use the same sign-in. Recipients can create an account to claim certificates. Club admins should use the account their district linked."
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
