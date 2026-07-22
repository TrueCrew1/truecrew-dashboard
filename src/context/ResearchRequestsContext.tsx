import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ADAPTER_RESEARCH_REQUESTS } from "@/lib/research/adapterRequests";
import {
  buildSessionResearchRequest,
  loadSessionResearchRequests,
  mergeResearchRequests,
  saveSessionResearchRequests,
} from "@/lib/research/sessionStore";
import type { ResearchRequest } from "@/lib/research/types";

interface ResearchRequestsContextValue {
  adapterRequests: ResearchRequest[];
  sessionRequests: ResearchRequest[];
  allRequests: ResearchRequest[];
  createSessionRequest: (topic: string) => ResearchRequest;
}

const ResearchRequestsContext = createContext<ResearchRequestsContextValue | null>(null);

export function ResearchRequestsProvider({ children }: { children: ReactNode }) {
  const [sessionRequests, setSessionRequests] = useState<ResearchRequest[]>(() =>
    loadSessionResearchRequests(),
  );

  useEffect(() => {
    saveSessionResearchRequests(sessionRequests);
  }, [sessionRequests]);

  const adapterRequests = useMemo(() => [...ADAPTER_RESEARCH_REQUESTS], []);

  const allRequests = useMemo(
    () => mergeResearchRequests(sessionRequests, adapterRequests),
    [sessionRequests, adapterRequests],
  );

  const createSessionRequest = useCallback((topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) {
      throw new Error("Research topic cannot be empty");
    }
    const request = buildSessionResearchRequest(trimmed);
    setSessionRequests((prev) => [request, ...prev]);
    return request;
  }, []);

  const value = useMemo<ResearchRequestsContextValue>(
    () => ({
      adapterRequests,
      sessionRequests,
      allRequests,
      createSessionRequest,
    }),
    [adapterRequests, sessionRequests, allRequests, createSessionRequest],
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
