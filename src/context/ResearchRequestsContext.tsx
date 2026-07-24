import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createResearchRequestOnApi,
  fetchResearchRequestsFromApi,
  isLiveApiEnabled,
  patchResearchRequestStatusOnApi,
} from "@/lib/api/client";
import { ADAPTER_RESEARCH_REQUESTS } from "@/lib/research/adapterRequests";
import {
  applyResearchStatus,
  buildSessionResearchRequest,
  loadSessionResearchRequests,
  mergeResearchRequests,
  saveSessionResearchRequests,
} from "@/lib/research/sessionStore";
import type { ResearchRequest, ResearchRequestStatus } from "@/lib/research/types";

/**
 * Which store is backing the queue right now.
 * - "live": /api/research (Supabase) — status editable on every row, from any
 *   device. Locally-created rows not yet on the server still merge in.
 * - "session": live API off or unreachable — adapter backlog (static) plus
 *   browser-local session rows, exactly the pre-database behavior.
 * - "loading": live API on, first fetch not finished — do not treat as session
 *   for approve/create (avoids silent adapter approve failures).
 */
export type ResearchRail = "live" | "session" | "loading";

const LIVE_SOFT_POLL_MS = 30_000;

interface ResearchRequestsContextValue {
  rail: ResearchRail;
  /** Non-null when a live read/write failed — data is safe locally, but say so. */
  syncError: string | null;
  adapterRequests: ResearchRequest[];
  sessionRequests: ResearchRequest[];
  allRequests: ResearchRequest[];
  createSessionRequest: (topic: string) => ResearchRequest;
  /** Operator-driven status change — any row on the live rail, session rows otherwise. */
  updateRequestStatus: (
    id: string,
    next: ResearchRequestStatus,
    options?: { filedPath?: string; blockerNote?: string },
  ) => ResearchRequest;
  /** Soft-refresh live queue (no-op when live API is off). */
  refreshLiveQueue: () => void;
}

const ResearchRequestsContext = createContext<ResearchRequestsContextValue | null>(null);

function findAdapterRequest(id: string): ResearchRequest | undefined {
  return ADAPTER_RESEARCH_REQUESTS.find((row) => row.id === id);
}

function applyOverrides(
  rows: ResearchRequest[],
  overrides: Record<string, ResearchRequest>,
): ResearchRequest[] {
  if (Object.keys(overrides).length === 0) return rows;
  return rows.map((row) => overrides[row.id] ?? row);
}

export function ResearchRequestsProvider({ children }: { children: ReactNode }) {
  const liveApi = isLiveApiEnabled();
  const [sessionRequests, setSessionRequests] = useState<ResearchRequest[]>(() =>
    loadSessionResearchRequests(),
  );
  // null until a live fetch succeeds; presence of server rows IS the live rail.
  const [serverRequests, setServerRequests] = useState<ResearchRequest[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(liveApi);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Optimistic patches that must remain visible while the first live fetch is
  // still in flight (or briefly after a write before soft-poll catches up).
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ResearchRequest>>({});

  useEffect(() => {
    saveSessionResearchRequests(sessionRequests);
  }, [sessionRequests]);

  const ingestServerRows = useCallback((rows: ResearchRequest[]) => {
    setServerRequests(rows);
    setLiveLoading(false);
    setSyncError(null);
    // Drop overrides the server already reflects (same id + status).
    setStatusOverrides((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of rows) {
        const override = next[row.id];
        if (override && override.status === row.status) {
          delete next[row.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const refreshLiveQueue = useCallback(() => {
    if (!isLiveApiEnabled()) return;
    fetchResearchRequestsFromApi()
      .then((rows) => {
        ingestServerRows(rows);
      })
      .catch((error) => {
        console.error("[research-rail] live_fetch_failed", error);
        setLiveLoading(false);
        setSyncError(
          "Live research queue unavailable — showing the local session + adapter backlog instead.",
        );
      });
  }, [ingestServerRows]);

  useEffect(() => {
    if (!liveApi) {
      setLiveLoading(false);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    fetchResearchRequestsFromApi()
      .then((rows) => {
        if (cancelled) return;
        ingestServerRows(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[research-rail] live_fetch_failed", error);
        setLiveLoading(false);
        setSyncError(
          "Live research queue unavailable — showing the local session + adapter backlog instead.",
        );
      });

    const timer = window.setInterval(() => {
      fetchResearchRequestsFromApi()
        .then((rows) => {
          if (cancelled) return;
          ingestServerRows(rows);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[research-rail] live_soft_poll_failed", error);
          setSyncError(
            "Live research queue refresh failed — last known rows may be stale. Retry or reload.",
          );
        });
    }, LIVE_SOFT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveApi, ingestServerRows]);

  const rail: ResearchRail = liveApi
    ? liveLoading && !serverRequests
      ? "loading"
      : serverRequests
        ? "live"
        : "session"
    : "session";

  const staticAdapterRequests = useMemo(() => [...ADAPTER_RESEARCH_REQUESTS], []);

  // Session-promoted adapter rows (offline approve) replace the static copy so
  // the same id never appears twice in the queue.
  const sessionIds = useMemo(
    () => new Set(sessionRequests.map((row) => row.id)),
    [sessionRequests],
  );

  const adapterRequests = useMemo(
    () =>
      serverRequests
        ? serverRequests.filter((row) => row.source === "adapter")
        : staticAdapterRequests.filter((row) => !sessionIds.has(row.id)),
    [serverRequests, staticAdapterRequests, sessionIds],
  );

  // Session rows the server doesn't know about (created offline, or a POST
  // failed) stay visible on the live rail instead of silently disappearing.
  const localOnlySessionRequests = useMemo(() => {
    if (!serverRequests) return sessionRequests;
    const serverIds = new Set(serverRequests.map((row) => row.id));
    return sessionRequests.filter((row) => !serverIds.has(row.id));
  }, [serverRequests, sessionRequests]);

  const allRequests = useMemo(() => {
    const merged = serverRequests
      ? mergeResearchRequests(localOnlySessionRequests, serverRequests)
      : mergeResearchRequests(sessionRequests, adapterRequests);
    return applyOverrides(merged, statusOverrides);
  }, [
    serverRequests,
    localOnlySessionRequests,
    sessionRequests,
    adapterRequests,
    statusOverrides,
  ]);

  const createSessionRequest = useCallback(
    (topic: string) => {
      const trimmed = topic.trim();
      if (!trimmed) {
        throw new Error("Research topic cannot be empty");
      }
      const request = buildSessionResearchRequest(trimmed);
      // Always persisted locally first — the request survives a failed POST
      // and a reload either way; on live it deduplicates once the server copy
      // lands in serverRequests.
      setSessionRequests((prev) => [request, ...prev]);

      // POST whenever live API is enabled — not only after the first fetch —
      // so creates during "loading" still sync to Supabase.
      if (isLiveApiEnabled()) {
        createResearchRequestOnApi(request)
          .then((serverRow) => {
            setServerRequests((prev) => (prev ? [serverRow, ...prev.filter((r) => r.id !== serverRow.id)] : prev));
            setSyncError(null);
          })
          .catch((error) => {
            console.error("[research-rail] live_create_failed", error);
            setSyncError(
              `Live save failed for "${request.topic}" — the request is kept in this browser and will not sync until retried.`,
            );
          });
      }
      return request;
    },
    [],
  );

  const updateRequestStatus = useCallback(
    (
      id: string,
      next: ResearchRequestStatus,
      options?: { filedPath?: string; blockerNote?: string },
    ) => {
      const serverRow = serverRequests?.find((row) => row.id === id);
      const sessionRow = sessionRequests.find((row) => row.id === id);
      const overrideRow = statusOverrides[id];
      const adapterRow = findAdapterRequest(id);
      const current = overrideRow ?? serverRow ?? sessionRow ?? adapterRow;
      if (!current) {
        throw new Error(`Research request not found: ${id}`);
      }

      const nextRow = applyResearchStatus(current, next, options);

      if (isLiveApiEnabled()) {
        // Optimistic: prefer patching the live list; fall back to an override
        // so approve-during-loading still shows in_progress immediately.
        if (serverRequests) {
          setServerRequests((prev) =>
            prev ? prev.map((row) => (row.id === id ? nextRow : row)) : prev,
          );
        } else {
          setStatusOverrides((prev) => ({ ...prev, [id]: nextRow }));
        }

        patchResearchRequestStatusOnApi(id, next, options)
          .then((persisted) => {
            setServerRequests((prev) =>
              prev
                ? prev.map((row) => (row.id === id ? persisted : row))
                : prev,
            );
            setStatusOverrides((prev) => {
              if (!prev[id]) return prev;
              const rest = { ...prev };
              delete rest[id];
              return rest;
            });
            setSyncError(null);
            // If the first list fetch has not landed yet, pull once so rail
            // becomes "live" with the patched row instead of staying on overrides.
            if (!serverRequests) {
              refreshLiveQueue();
            }
          })
          .catch((error) => {
            console.error("[research-rail] live_update_failed", error);
            if (serverRow) {
              setServerRequests((prev) =>
                prev ? prev.map((row) => (row.id === id ? serverRow : row)) : prev,
              );
            }
            setStatusOverrides((prev) => {
              if (!prev[id]) return prev;
              const rest = { ...prev };
              delete rest[id];
              return rest;
            });
            setSyncError(
              `Live update failed for "${current.topic}" — status reverted to ${current.status}. Check VITE_INTERNAL_KEY / Supabase, then try again.`,
            );
          });
        return nextRow;
      }

      // Session rail: promote adapter backlog into the editable session store
      // so Start-research approve can truthfully move queued → in_progress
      // (source becomes session so the change survives reload).
      const sessionNext: ResearchRequest = { ...nextRow, source: "session" };
      setSessionRequests((prev) => {
        const without = prev.filter((row) => row.id !== id);
        return [sessionNext, ...without];
      });
      return sessionNext;
    },
    [serverRequests, sessionRequests, statusOverrides, refreshLiveQueue],
  );

  const value = useMemo<ResearchRequestsContextValue>(
    () => ({
      rail,
      syncError,
      adapterRequests,
      sessionRequests,
      allRequests,
      createSessionRequest,
      updateRequestStatus,
      refreshLiveQueue,
    }),
    [
      rail,
      syncError,
      adapterRequests,
      sessionRequests,
      allRequests,
      createSessionRequest,
      updateRequestStatus,
      refreshLiveQueue,
    ],
  );

  return (
    <ResearchRequestsContext.Provider value={value}>{children}</ResearchRequestsContext.Provider>
  );
}

export function useResearchRequests() {
  const ctx = useContext(ResearchRequestsContext);
  if (!ctx) {
    throw new Error("useResearchRequests must be used within ResearchRequestsProvider");
  }
  return ctx;
}
