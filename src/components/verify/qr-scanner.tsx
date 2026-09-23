"use client";

import jsQR from "jsqr";
import { Camera, CameraOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isLeoVerifyQrPayload,
  parseVerifyInput,
} from "@/lib/certificates/parse-verify-input";
import { cn } from "@/lib/utils";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function getBarcodeDetector():
  | (new (opts?: { formats?: string[] }) => BarcodeDetectorLike)
  | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts?: {
        formats?: string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  return ctor ?? null;
}

export function QrScanner({
  onDetected,
  className,
}: {
  onDetected: (payload: { id: string; token: string }) => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const handledRef = useRef(false);

  const releaseCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    releaseCamera();
    setScanning(false);
  }, [releaseCamera]);

  const handleRaw = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      if (!isLeoVerifyQrPayload(raw)) return;
      const parsed = parseVerifyInput(raw);
      if (!parsed.id) return;
      handledRef.current = true;
      stop();
      setOpen(false);
      onDetected(parsed);
    },
    [onDetected, stop],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    handledRef.current = false;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available in this browser.");
        return;
      }
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        location.hostname !== "localhost"
      ) {
        setError("Camera scanning requires HTTPS (or localhost).");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setScanning(true);

        const Detector = getBarcodeDetector();
        let detector: BarcodeDetectorLike | null = null;
        if (Detector) {
          try {
            detector = new Detector({ formats: ["qr_code"] });
          } catch {
            detector = null;
          }
        }

        const tick = async () => {
          if (cancelled || handledRef.current) return;
          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (!v || !canvas || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(() => {
              void tick();
            });
            return;
          }

          const w = v.videoWidth;
          const h = v.videoHeight;
          if (w && h) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, w, h);
              try {
                if (detector) {
                  const codes = await detector.detect(canvas);
                  for (const code of codes) {
                    if (code.rawValue) handleRaw(code.rawValue);
                  }
                } else {
                  const imageData = ctx.getImageData(0, 0, w, h);
                  const code = jsQR(imageData.data, w, h, {
                    inversionAttempts: "dontInvert",
                  });
                  if (code?.data) handleRaw(code.data);
                }
              } catch {
                /* keep scanning */
              }
            }
          }

          if (!handledRef.current && !cancelled) {
            rafRef.current = requestAnimationFrame(() => {
              void tick();
            });
          }
        };

        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        setError(
          "Could not access the camera. Allow camera permission and try again.",
        );
        setScanning(false);
      }
    }

    void start();
    return () => {
      cancelled = true;
      releaseCamera();
    };
  }, [open, handleRaw, releaseCamera]);

  if (!mounted || !open) {
    return (
      <div className={cn(className)}>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={
            mounted
              ? () => {
                  setError(null);
                  setOpen(true);
                }
              : undefined
          }
        >
          <Camera className="size-4" />
          Scan QR code
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border bg-muted/30 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Point your camera at a LeoVerify QR
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Close scanner"
          onClick={() => {
            stop();
            setOpen(false);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Starting camera…
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <CameraOff className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Scanning stays on this device. Only LeoVerify verify links are accepted.
      </p>
    </div>
  );
}
