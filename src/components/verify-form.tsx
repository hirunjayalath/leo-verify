"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [token, setToken] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const id = certificateId.trim();
    if (!id) return;
    const params = new URLSearchParams();
    if (token.trim()) params.set("t", token.trim());
    const qs = params.toString();
    router.push(`/v/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="certificate-id">Certificate ID</Label>
        <Input
          id="certificate-id"
          placeholder="LEO-UOM-2026-000123"
          value={certificateId}
          onChange={(e) => setCertificateId(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      {!compact && (
        <div className="space-y-2">
          <Label htmlFor="token">
            Verification token{" "}
            <span className="font-normal text-muted-foreground">(from QR link)</span>
          </Label>
          <Input
            id="token"
            placeholder="Paste token if you have it"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Verify certificate
      </Button>
    </form>
  );
}
