"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { QrScanner } from "@/components/verify/qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { parseVerifyInput } from "@/lib/certificates/parse-verify-input";

export function VerifyForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [token, setToken] = useState("");
  const [pending, startTransition] = useTransition();

  function navigateToVerify(id: string, t: string) {
    const trimmedId = id.trim();
    if (!trimmedId) return;
    const params = new URLSearchParams();
    if (t.trim()) params.set("t", t.trim());
    const qs = params.toString();
    startTransition(() => {
      router.push(
        `/v/${encodeURIComponent(trimmedId)}${qs ? `?${qs}` : ""}`,
      );
    });
  }

  function onIdChange(value: string) {
    const parsed = parseVerifyInput(value);
    if (parsed.token) {
      setCertificateId(parsed.id);
      setToken(parsed.token);
      return;
    }
    setCertificateId(value);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseVerifyInput(certificateId);
    navigateToVerify(parsed.id, parsed.token || token);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="certificate-id">Certificate ID or full verify link</Label>
        <Input
          id="certificate-id"
          placeholder="LEO-UOM-2026-000123 or paste /v/…?t=…"
          value={certificateId}
          onChange={(e) => onIdChange(e.target.value)}
          autoComplete="off"
          autoFocus
          required
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Paste the full link from the QR if you have it — we will fill the token.
        </p>
      </div>
      {!compact && (
        <div className="space-y-2">
          <Label htmlFor="token">
            Verification token{" "}
            <span className="font-normal text-muted-foreground">
              (from QR link)
            </span>
          </Label>
          <Input
            id="token"
            placeholder="Paste token if you have it"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            disabled={pending}
          />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Checking…" : "Verify certificate"}
        </Button>
        <QrScanner
          onDetected={({ id, token: t }) => {
            setCertificateId(id);
            setToken(t);
            navigateToVerify(id, t);
          }}
        />
      </div>
    </form>
  );
}
