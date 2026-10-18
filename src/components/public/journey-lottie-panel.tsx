"use client";

import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// CSP blocks CDN fetches; serve WASM from /public (see next.config headers).
setWasmUrl("/dotlottie-player.wasm");

/** Pastel panel backgrounds per journey step (matches prior illustrated cards). */
const panelTints: Record<string, string> = {
  "01": "bg-sky-100 dark:bg-sky-950/40",
  "02": "bg-amber-100 dark:bg-amber-950/35",
  "03": "bg-orange-100 dark:bg-orange-950/35",
  "04": "bg-violet-100 dark:bg-violet-950/35",
  "05": "bg-emerald-100 dark:bg-emerald-950/35",
};

/** Vendored DotLottie assets (Lottie Simple License via LottieFiles). */
const stepToSrc: Record<string, string> = {
  "01": "/lottie/design.lottie",
  "02": "/lottie/generate.lottie",
  "03": "/lottie/deliver.lottie",
  "04": "/lottie/showcase.lottie",
  "05": "/lottie/verify.lottie",
};

export function JourneyLottiePanel({
  step,
  className,
}: {
  step: string;
  className?: string;
}) {
  const tint = panelTints[step] ?? "bg-muted";
  const src = stepToSrc[step];
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!src) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[9.5rem] items-center justify-center overflow-hidden rounded-b-2xl",
        tint,
        className,
      )}
      aria-hidden="true"
    >
      <DotLottieReact
        src={src}
        loop={!reduceMotion}
        autoplay={!reduceMotion}
        className="h-[9.5rem] w-full max-w-[13.5rem] sm:max-w-[15rem]"
      />
    </div>
  );
}
