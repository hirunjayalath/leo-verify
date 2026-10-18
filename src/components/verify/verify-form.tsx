"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import {
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Search,
  ShieldCheck,
} from "lucide-react";
import { QrScanner } from "@/components/verify/qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { parseVerifyInput } from "@/lib/certificates/parse-verify-input";
import { cn } from "@/lib/utils";

type VerifyFormLayout = "prompt" | "standard";

export function VerifyForm({
  compact = false,
  layout,
  presetId,
  onClearPreset,
  variant = "default",
}: {
  compact?: boolean;
  layout?: VerifyFormLayout;
  presetId?: string;
  onClearPreset?: () => void;
  variant?: "default" | "editorial";
}) {
  const resolvedLayout: VerifyFormLayout =
    layout ?? (compact ? "standard" : "prompt");

  const router = useRouter();
  const [certificateId, setCertificateId] = useState(presetId || "");
  const [prevPresetId, setPrevPresetId] = useState(presetId);
  if (presetId !== prevPresetId) {
    setPrevPresetId(presetId);
    if (presetId && !certificateId) {
      setCertificateId(presetId);
    }
  }
  const [token, setToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
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
    if (onClearPreset && presetId && value !== presetId) {
      onClearPreset();
    }
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

  function onTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (certificateId.trim()) {
        const parsed = parseVerifyInput(certificateId);
        navigateToVerify(parsed.id, parsed.token || token);
      }
    }
  }

  const showTokenControls = resolvedLayout === "prompt" || !compact;
  const isEditorial = variant === "editorial";

  return (
    <div id="verify" className="w-full scroll-mt-24">
      <form onSubmit={onSubmit} className="relative">
        <div
          className={cn(
            "transition-all duration-200",
            isEditorial
              ? "verify-editorial-shell p-3 sm:p-6"
              : cn(
                  "rounded-2xl border border-border/80 bg-card shadow-card sm:rounded-3xl",
                  resolvedLayout === "prompt"
                    ? "verify-prompt-shell p-4 sm:p-5 focus-within:border-accent/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-accent/10"
                    : "p-4 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10",
                ),
          )}
        >
          {resolvedLayout === "prompt" ? (
            <>
              <Label htmlFor="certificate-id" className="sr-only">
                Certificate ID or verification link
              </Label>
              <div
                className={cn(
                  isEditorial
                    ? "verify-editorial-input-row flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3.5"
                    : "flex items-start gap-3 sm:gap-3.5",
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-2 sm:block",
                    !isEditorial && "contents",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center",
                      isEditorial
                        ? "verify-editorial-icon"
                        : "mt-1.5 rounded-full bg-accent/10 text-accent",
                    )}
                  >
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  </div>
                  {isEditorial ? (
                    <span
                      className="text-xs font-medium text-[var(--he-muted)] sm:hidden"
                      id="certificate-id-mobile-label"
                    >
                      Certificate ID or check link
                    </span>
                  ) : null}
                </div>
                <textarea
                  id="certificate-id"
                  rows={isEditorial ? 2 : 3}
                  aria-labelledby={
                    isEditorial ? "certificate-id-mobile-label" : undefined
                  }
                  placeholder={
                    isEditorial
                      ? "e.g. LEO-UOM-2026-000123 or paste link"
                      : "Enter certificate ID (e.g. LEO-UOM-2026-000123) or paste check link…"
                  }
                  value={certificateId}
                  onChange={(e) => onIdChange(e.target.value)}
                  onKeyDown={onTextareaKeyDown}
                  autoComplete="off"
                  autoFocus={!compact}
                  required
                  disabled={pending}
                  className={cn(
                    "verify-prompt-input w-full flex-1 resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:text-base",
                    isEditorial
                      ? "verify-editorial-textarea min-h-[2.75rem] font-normal leading-snug placeholder:font-light sm:min-h-[5.25rem] sm:leading-normal"
                      : "min-h-[5.25rem] leading-relaxed placeholder:font-light placeholder:text-muted-foreground/70 sm:min-h-[5.5rem]",
                  )}
                />
              </div>

              {showTokenInput && (
                <div
                  className={cn(
                    "mt-3 border-t px-2 pt-3 animate-fade-up sm:px-3",
                    isEditorial
                      ? "verify-editorial-divider"
                      : "border-border/60",
                  )}
                >
                  <Label
                    htmlFor="token"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Verification token (optional)
                  </Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="HMAC token (hex) if not in the link…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    autoComplete="off"
                    disabled={pending}
                    className="mt-1.5 font-mono text-xs"
                  />
                </div>
              )}

              <div
                className={cn(
                  "mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4",
                  isEditorial
                    ? "verify-editorial-divider verify-editorial-actions"
                    : "border-border/60",
                )}
              >
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-1.5",
                    isEditorial && "verify-editorial-toolbar w-full sm:w-auto",
                  )}
                >
                  <Button
                    type="button"
                    variant={isEditorial ? "outline" : showScanner ? "accent" : "pill"}
                    size="sm"
                    onClick={() => setShowScanner((prev) => !prev)}
                    className={cn(isEditorial && "rounded-none border-[var(--he-line-strong)]")}
                  >
                    <Camera data-icon="inline-start" aria-hidden="true" />
                    Scan QR
                  </Button>
                  <Button
                    type="button"
                    variant={isEditorial ? "outline" : "pill"}
                    size="sm"
                    onClick={() => setShowTokenInput((prev) => !prev)}
                    className={cn(isEditorial && "rounded-none border-[var(--he-line-strong)]")}
                  >
                    Token
                    {showTokenInput ? (
                      <ChevronUp data-icon="inline-end" aria-hidden="true" />
                    ) : (
                      <ChevronDown data-icon="inline-end" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isEditorial ? "ml-0 w-full sm:ml-auto sm:w-auto" : "ml-auto",
                  )}
                >
                  {isEditorial ? null : (
                    <div className="hidden items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
                      <span className="size-2 rounded-full bg-success animate-pulse" />
                      Live DB
                    </div>
                  )}
                  <Button
                    type="submit"
                    size={isEditorial ? "lg" : "icon"}
                    variant={isEditorial ? "outline" : "accent"}
                    disabled={pending || !certificateId.trim()}
                    aria-label="Verify certificate"
                    className={cn(
                      isEditorial
                        ? "h-11 w-full rounded-none border-[var(--he-line-strong)] sm:h-10 sm:w-10 sm:px-0"
                        : "size-10 shrink-0",
                    )}
                  >
                    {pending ? (
                      <Spinner />
                    ) : isEditorial ? (
                      <>
                        <span className="sm:hidden">Verify certificate</span>
                        <ArrowUp className="hidden sm:block" aria-hidden="true" />
                      </>
                    ) : (
                      <ArrowUp aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="certificate-id"
                    className="text-sm font-semibold text-foreground"
                  >
                    Certificate ID or verification link
                  </Label>
                  {!compact && (
                    <p className="text-xs text-muted-foreground">
                      Paste an ID, full check URL, or scan the QR on the
                      certificate.
                    </p>
                  )}
                </div>
                <Textarea
                  id="certificate-id"
                  rows={compact ? 2 : 3}
                  placeholder="LEO-UOM-2026-000123 or https://…/v/…"
                  value={certificateId}
                  onChange={(e) => onIdChange(e.target.value)}
                  onKeyDown={onTextareaKeyDown}
                  autoComplete="off"
                  autoFocus={!compact}
                  required
                  disabled={pending}
                  className="min-h-[4.5rem] resize-none text-sm font-medium leading-relaxed"
                />
              </div>

              {showTokenInput && showTokenControls && (
                <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 animate-fade-up">
                  <div className="flex items-center gap-2">
                    <KeyRound
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Label
                      htmlFor="token"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Verification token (optional)
                    </Label>
                  </div>
                  <Input
                    id="token"
                    type="text"
                    placeholder="HMAC token (hex) if not in the link…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    autoComplete="off"
                    disabled={pending}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={showScanner ? "accent" : "pill"}
                    size="sm"
                    onClick={() => setShowScanner((prev) => !prev)}
                  >
                    <Camera data-icon="inline-start" aria-hidden="true" />
                    Scan QR
                  </Button>
                  {showTokenControls && (
                    <Button
                      type="button"
                      variant="pill"
                      size="sm"
                      onClick={() => setShowTokenInput((prev) => !prev)}
                    >
                      Token
                      {showTokenInput ? (
                        <ChevronUp data-icon="inline-end" aria-hidden="true" />
                      ) : (
                        <ChevronDown
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
                    <span className="size-2 rounded-full bg-success animate-pulse" />
                    Live database
                  </div>
                  <Button
                    type="submit"
                    variant="accent"
                    size={compact ? "sm" : "default"}
                    disabled={pending || !certificateId.trim()}
                  >
                    {pending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Search data-icon="inline-start" aria-hidden="true" />
                    )}
                    Check certificate
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </form>

      {showScanner && (
        <div className="mt-3 animate-fade-up">
          <QrScanner
            onDetected={({ id, token: t }) => {
              setCertificateId(id);
              setToken(t);
              setShowScanner(false);
              navigateToVerify(id, t);
            }}
          />
        </div>
      )}
    </div>
  );
}
