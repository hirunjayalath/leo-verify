"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  persistTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(resolveTheme(stored));

    if (stored !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: ResolvedTheme = theme === "dark" ? "light" : "dark";
    persistTheme(next);
    setTheme(next);
  }

  const toLight = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
        className,
      )}
      aria-label={toLight ? "Switch to light mode" : "Switch to dark mode"}
    >
      {toLight ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
