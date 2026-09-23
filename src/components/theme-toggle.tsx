"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  persistTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const listeners = new Set<() => void>();

function subscribeTheme(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function emitThemeChange() {
  for (const listener of listeners) listener();
}

function getThemeSnapshot(): ResolvedTheme {
  return resolveTheme(readStoredTheme());
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => "light" as const,
  );

  function toggle() {
    persistTheme(theme === "dark" ? "light" : "dark");
    emitThemeChange();
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
