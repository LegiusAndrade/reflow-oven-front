// Single source of truth for mapping a stored Theme ("light" | "dark" | "system") to the concrete
// `data-theme` attribute consumed by globals.css (which only has "dark"/"light" buckets).
//
// "system" is resolved at runtime via prefers-color-scheme. Both functions are SSR-safe: when there
// is no `window` they fall back to "dark" (matching layout.tsx's pre-hydration default).

import type { Theme } from "./api";

export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "dark" || theme === "light") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(theme);
}
