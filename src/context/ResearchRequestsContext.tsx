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
 */
export type ResearchRail = "live" | "session";

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
}

const ResearchRequestsContext = createContext<ResearchRequestsContextValue | null>(null);

export function ResearchRequestsProvider({ children }: { children: ReactNode }) {
  const [sessionRequests, setSessionRequests] = useState<ResearchRequest[]>(() =>
    loadSessionResearchRequests(),
  );
  // null until a live fetch succeeds; presence of server rows IS the live rail.
  const [serverRequests, setServerRequests] = useState<ResearchRequest[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    saveSessionResearchRequests(sessionRequests);
  }, [sessionRequests]);

  useEffect(() => {
    if (!isLiveApiEnabled()) return;
    let cancelled = false;

    const load = () =>
      fetchResearchRequestsFromApi()
        .then((rows) => {
          if (cancelled) return;
          setServerRequests(rows);
          setSyncError(null);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[research-rail] live_fetch_failed", error);
          setSyncError(
            "Live research queue unavailable — showing the local session + adapter backlog instead.",
          );
        });

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const rail: ResearchRail = serverRequests ? "live" : "session";

  const staticAdapterRequests = useMemo(() => [...ADAPTER_RESEARCH_REQUESTS], []);

  const adapterRequests = useMemo(
    () =>
      serverRequests
        ? serverRequests.filter((row) => row.source === "adapter")
        : staticAdapterRequests,
    [serverRequests, staticAdapterRequests],
  );

  // Session rows the server doesn't know about (created offline, or a POST
  // failed) stay visible on the live rail instead of silently disappearing.
  const localOnlySessionRequests = useMemo(() => {
    if (!serverRequests) return sessionRequests;
    const serverIds = new Set(serverRequests.map((row) => row.id));
    return sessionRequests.filter((row) => !serverIds.has(row.id));
  }, [serverRequests, sessionRequests]);

  const allRequests = useMemo(
    () =>
      serverRequests
        ? mergeResearchRequests(localOnlySessionRequests, serverRequests)
        : mergeResearchRequests(sessionRequests, staticAdapterRequests),
    [serverRequests, localOnlySessionRequests, sessionRequests, staticAdapterRequests],
  );

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

      if (rail === "live") {
        createResearchRequestOnApi(request)
          .then((serverRow) => {
            setServerRequests((prev) => (prev ? [serverRow, ...prev] : prev));
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
    [rail],
  );

  const updateRequestStatus = useCallback(
    (
      id: string,
      next: ResearchRequestStatus,
      options?: { filedPath?: string; blockerNote?: string },
    ) => {
      const serverRow = serverRequests?.find((row) => row.id === id);
      if (serverRow) {
        // Validate + apply locally first (throws on an invalid transition),
        // then persist; revert the optimistic change if the server rejects.
        const nextRow = applyResearchStatus(serverRow, next, options);
        setServerRequests((prev) =>
          prev ? prev.map((row) => (row.id === id ? nextRow : row)) : prev,
        );
        patchResearchRequestStatusOnApi(id, next, options)
          .then((persisted) => {
            setServerRequests((prev) =>
              prev ? prev.map((row) => (row.id === id ? persisted : row)) : prev,
            );
            setSyncError(null);
          })
          .catch((error) => {
            console.error("[research-rail] live_update_failed", error);
            setServerRequests((prev) =>
              prev ? prev.map((row) => (row.id === id ? serverRow : row)) : prev,
            );
            setSyncError(
              `Live update failed for "${serverRow.topic}" — status reverted to ${serverRow.status}. Try again.`,
            );
          });
        return nextRow;
      }

      const current = sessionRequests.find((row) => row.id === id);
      if (!current) {
        throw new Error(`Research request not found: ${id}`);
      }
      const nextRow = applyResearchStatus(current, next, options);
      setSessionRequests((prev) => prev.map((row) => (row.id === id ? nextRow : row)));
      return nextRow;
    },
    [serverRequests, sessionRequests],
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
    }),
    [
      rail,
      syncError,
      adapterRequests,
      sessionRequests,
      allRequests,
      createSessionRequest,
      updateRequestStatus,
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
