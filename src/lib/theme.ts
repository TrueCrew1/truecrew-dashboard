export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "truecrew.theme";

export function resolveTheme(stored: ThemeMode | null, systemPrefersLight: boolean): "light" | "dark" {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersLight ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode) {
  const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolved = resolveTheme(mode, systemPrefersLight);
  document.documentElement.dataset.theme = resolved;
}
