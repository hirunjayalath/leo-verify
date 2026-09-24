"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
};

export function AdminMfaSetup({
  initialLevel,
  initialFactors,
}: {
  initialLevel: "aal1" | "aal2" | null;
  initialFactors: Factor[];
}) {
  const router = useRouter();
  const [level, setLevel] = useState(initialLevel);
  const [factors, setFactors] = useState<Factor[]>(initialFactors);
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const supabase = createBrowserSupabaseClient();
    const [{ data: aal }, { data: list }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    setLevel(
      aal?.currentLevel === "aal2"
        ? "aal2"
        : aal?.currentLevel
          ? "aal1"
          : null,
    );
    const totp = [
      ...(list?.totp ?? []),
      ...(list?.phone ?? []),
    ] as Factor[];
    setFactors(totp.filter((f) => f.factor_type === "totp"));
  }

  useEffect(() => {
    if (level === "aal2") {
      router.replace("/continue");
      router.refresh();
    }
  }, [level, router]);

  function enroll() {
    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "LeoVerify admin",
      });
      if (error || !data) {
        toast.error(error?.message ?? "Could not start authenticator setup");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      toast.message("Scan the QR code with your authenticator app");
    });
  }

  function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      let id = factorId;
      if (!id) {
        const verified = factors.find((f) => f.status === "verified");
        id = verified?.id ?? factors[0]?.id ?? null;
      }
      if (!id) {
        toast.error("Enroll an authenticator first");
        return;
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: id });
      if (challenge.error || !challenge.data) {
        toast.error(challenge.error?.message ?? "Challenge failed");
        return;
      }

      const verified = await supabase.auth.mfa.verify({
        factorId: id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) {
        toast.error(verified.error.message);
        return;
      }

      toast.success("Authenticator verified");
      setCode("");
      setQr(null);
      setSecret(null);
      await refresh();
      router.replace("/continue");
      router.refresh();
    });
  }

  if (level === "aal2") {
    return (
      <p className="text-sm text-muted-foreground">
        Authenticator is on. Sending you to the dashboard.
      </p>
    );
  }

  const hasVerifiedFactor = factors.some((f) => f.status === "verified");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Enable authenticator
        </h1>
        <p className="text-sm text-muted-foreground">
          Club and district admins need a second factor. Use an authenticator
          app such as Google Authenticator or 1Password.
        </p>
      </div>

      {!hasVerifiedFactor && !qr && (
        <Button type="button" onClick={enroll} disabled={pending}>
          {pending && <Spinner />}
          Set up authenticator
        </Button>
      )}

      {qr && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Scan this QR code</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Authenticator QR code"
            className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
          />
          {secret && (
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              Manual key: {secret}
            </p>
          )}
        </div>
      )}

      {(qr || hasVerifiedFactor) && (
        <form onSubmit={onVerify} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {hasVerifiedFactor && !qr
                ? "Enter the code from your authenticator"
                : "Enter the 6-digit code to confirm"}
            </Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <Button type="submit" disabled={pending || code.trim().length < 6}>
            {pending && <Spinner />}
            Verify and continue
          </Button>
        </form>
      )}

      {hasVerifiedFactor && !qr && (
        <p className="text-xs text-muted-foreground">
          An authenticator is already on this account. Enter a fresh code to
          finish this sign-in.
        </p>
      )}
    </div>
  );
}
