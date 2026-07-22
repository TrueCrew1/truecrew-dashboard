import { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";

export type { ResearchRequest, ResearchRequestSource } from "./types";
export { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";
export {
  buildSessionResearchRequest,
  loadSessionResearchRequests,
  mergeResearchRequests,
  saveSessionResearchRequests,
} from "./sessionStore";

/** @deprecated Use ADAPTER_RESEARCH_REQUESTS or ResearchRequestsContext.allRequests */
export { ADAPTER_RESEARCH_REQUESTS as RESEARCH_REQUESTS };

/** Adapter-only backlog — session requests come from ResearchRequestsContext. */
export function getResearchRequests() {
  return [...ADAPTER_RESEARCH_REQUESTS];
}
