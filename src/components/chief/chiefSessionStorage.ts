/**
 * Generic browser-only localStorage helpers for Chief's client-side session
 * state (governance events, approval decisions). Callers own their own
 * versioned key and shape validator so a malformed or stale-shape value
 * falls back to `null` instead of crashing rehydration.
 */

export function loadSessionState<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.debug("[chief-session-storage] failed to load", key, error);
    return null;
  }
}

export function saveSessionState(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.debug("[chief-session-storage] failed to save", key, error);
  }
}
