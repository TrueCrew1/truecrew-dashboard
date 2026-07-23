import { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";

export type { ResearchRequest, ResearchRequestSource, ResearchRequestStatus } from "./types";
export {
  MS_ESTIMATING_ROADMAP_FINDING_PATH,
  RESEARCH_STATUS_LABEL,
} from "./types";
export { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";
export {
  applyResearchStatus,
  buildSessionResearchRequest,
  canTransitionResearchStatus,
  defaultFiledPathForTopic,
  isMsEstimatingRoadmapTopic,
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
