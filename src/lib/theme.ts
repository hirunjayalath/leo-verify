export const THEME_STORAGE_KEY = "leoverify-theme";

export type StoredTheme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function readStoredTheme(): StoredTheme {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    /* private mode */
  }
  return "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(stored: StoredTheme): ResolvedTheme {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme: ResolvedTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  applyResolvedTheme(theme);
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
