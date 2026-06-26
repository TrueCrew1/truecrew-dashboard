"use client";

import { useEffect, useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
    setMode(stored);
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycleTheme() {
    const next: ThemeMode =
      mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setMode(next);
    applyTheme(next);
  }

  const label =
    mode === "system" ? "System theme" : mode === "light" ? "Light theme" : "Dark theme";

  return (
    <button
      type="button"
      className="topbar-icon-btn"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      {mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐"}
    </button>
  );
}
