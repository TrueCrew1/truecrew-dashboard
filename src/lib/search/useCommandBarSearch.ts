import { useEffect, useRef, useState } from "react";
import { searchEntities, type SearchContext } from "./searchService";
import { buildSuggestedActions } from "./intentParser";
import { searchLog } from "./searchLog";
import type { SearchResultGroup, SearchStatus } from "./types";

const DEBOUNCE_MS = 180;
const RECENT_SEARCHES_KEY = "truecrew.commandbar.recentSearches";
const MAX_RECENT = 5;
/** Defensive cap — a pasted blob shouldn't be run through every scorer/regex on each keystroke. */
const MAX_QUERY_LENGTH = 200;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Best-effort only — storage may be unavailable (private browsing, quota); search still works without it.
  }
}

export interface UseCommandBarSearchResult {
  query: string;
  setQuery: (value: string) => void;
  status: SearchStatus;
  groups: SearchResultGroup[];
  errorMessage: string | null;
  recentSearches: string[];
  /** Saves the query to recent searches — call when a result from it is actually used. */
  commitQuery: (value: string) => void;
  clearRecentSearches: () => void;
  retry: () => void;
}

/**
 * Debounced search state machine over the real app data in `context`. Kept
 * synchronous under the hood today (searchService/intentParser are plain
 * functions, no network) — the debounce + try/catch scaffolding is real,
 * not cosmetic, so swapping in an async/remote search later is a change
 * inside the effect below, not a rewrite of CommandBar.
 */
export function useCommandBarSearch(context: SearchContext | null): UseCommandBarSearchResult {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [retryNonce, setRetryNonce] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);

    if (!trimmed) {
      setStatus("idle");
      setGroups([]);
      setErrorMessage(null);
      return;
    }

    setStatus("loading");

    const timer = window.setTimeout(() => {
      try {
        const entityGroups = context ? searchEntities(trimmed, context) : [];
        const actionItems = buildSuggestedActions(trimmed);
        const nextGroups = [...entityGroups];
        if (actionItems.length > 0) {
          nextGroups.push({ id: "actions", label: "Suggested actions", items: actionItems });
        }
        setGroups(nextGroups);
        setErrorMessage(null);
        setStatus(nextGroups.length === 0 ? "empty" : "success");

        searchLog.queryRun(
          trimmed,
          Object.fromEntries(nextGroups.map((group) => [group.id, group.items.length])),
        );
      } catch (error) {
        setGroups([]);
        setErrorMessage(error instanceof Error ? error.message : "Search failed — try again.");
        setStatus("error");
        searchLog.error(trimmed, error);
      }
    }, DEBOUNCE_MS);

    debounceRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [query, context, retryNonce]);

  const commitQuery = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((entry) => entry !== trimmed)].slice(0, MAX_RECENT);
      saveRecentSearches(next);
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const retry = () => setRetryNonce((n) => n + 1);

  return {
    query,
    setQuery,
    status,
    groups,
    errorMessage,
    recentSearches,
    commitQuery,
    clearRecentSearches,
    retry,
  };
}
