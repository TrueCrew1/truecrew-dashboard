/**
 * Derives a V2 program card's status badge from the live research queue, so
 * research-workstream cards track the one real status (the queue row) instead
 * of duplicating it as hardcoded strings. Cards without a researchRequestId,
 * or whose row isn't in the loaded queue, keep their static status — an
 * honest fallback, never an invented one.
 */
import type { V2ProgramCard, V2ProgramStatusTone } from "@/data/v2Program";
import {
  RESEARCH_STATUS_LABEL,
  type ResearchRequest,
  type ResearchRequestStatus,
} from "@/lib/research/types";

const STATUS_TONE: Record<ResearchRequestStatus, V2ProgramStatusTone> = {
  queued: "steel",
  in_progress: "yellow",
  blocked: "yellow",
  done: "green",
};

export interface V2CardLiveStatus {
  status: string;
  statusTone: V2ProgramStatusTone;
}

export function deriveV2CardStatus(
  card: V2ProgramCard,
  requests: ResearchRequest[],
): V2CardLiveStatus {
  if (!card.researchRequestId) {
    return { status: card.status, statusTone: card.statusTone };
  }
  const request = requests.find((row) => row.id === card.researchRequestId);
  if (!request) {
    return { status: card.status, statusTone: card.statusTone };
  }

  const label = `Research ${RESEARCH_STATUS_LABEL[request.status].toLowerCase()}`;
  const status =
    request.status === "done" && request.filedPath
      ? `${label} — filed ${request.filedPath}`
      : request.status === "blocked" && request.blockerNote
        ? `${label} — ${request.blockerNote}`
        : label;

  return { status, statusTone: STATUS_TONE[request.status] };
}
