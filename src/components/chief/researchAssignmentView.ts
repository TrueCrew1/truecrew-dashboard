/**
 * Shared view/resolve helpers so every Chief surface reads the same
 * research-assignment record (store wins over proposal snapshots).
 */
import {
  RESEARCH_ASSIGNMENT_LANE_LABEL,
  RESEARCH_ASSIGNMENT_STATUS_LABEL,
  RESEARCH_DISPATCH_MODE_LABEL,
  RESEARCH_RESULT_SOURCE_LABEL,
  type ResearchAssignment,
  type ResearchAssignmentStatus,
} from "@/lib/chief/researchAssignment";
import { getResearchAssignment } from "./researchAssignmentStore";
import type { ApprovalProposal } from "./types";

export {
  RESEARCH_DISPATCH_MODE_LABEL,
  RESEARCH_RESULT_SOURCE_LABEL,
} from "@/lib/chief/researchAssignment";

/** Canonical live assignment: session store first, then proposal snapshot. */
export function resolveLiveResearchAssignment(
  seed: ResearchAssignment | null | undefined,
): ResearchAssignment | null {
  if (!seed) return null;
  return getResearchAssignment(seed.id) ?? seed;
}

export function resolveLiveResearchAssignmentFromProposal(
  proposal: Pick<ApprovalProposal, "researchAssignment">,
): ResearchAssignment | null {
  return resolveLiveResearchAssignment(proposal.researchAssignment);
}

export function researchAssignmentStatusLabel(status: ResearchAssignmentStatus): string {
  return RESEARCH_ASSIGNMENT_STATUS_LABEL[status];
}

export function formatResearchAssignmentHeadline(assignment: ResearchAssignment): string {
  const live = resolveLiveResearchAssignment(assignment) ?? assignment;
  const lane = RESEARCH_ASSIGNMENT_LANE_LABEL[live.researcherLane];
  return `${live.title} · ${lane} · ${RESEARCH_ASSIGNMENT_STATUS_LABEL[live.status]}`;
}

export function formatResearchAssignmentAuditNote(assignment: ResearchAssignment): string {
  const live = resolveLiveResearchAssignment(assignment) ?? assignment;
  const lane = RESEARCH_ASSIGNMENT_LANE_LABEL[live.researcherLane];
  const parts = [
    `Research “${live.topic}” (${lane})`,
    `project ${live.projectName}`,
    `status ${RESEARCH_ASSIGNMENT_STATUS_LABEL[live.status]}`,
    RESEARCH_DISPATCH_MODE_LABEL[live.dispatchMode],
  ];
  if (live.result) {
    parts.push(`result: ${RESEARCH_RESULT_SOURCE_LABEL[live.result.source]}`);
  }
  return parts.join(" — ");
}

/** Compact home/Agents status line — always from live record when possible. */
export function formatResearchAssignmentBoardLine(assignment: ResearchAssignment): string {
  const live = resolveLiveResearchAssignment(assignment) ?? assignment;
  const status = RESEARCH_ASSIGNMENT_STATUS_LABEL[live.status];
  if (live.status === "completed" && live.result) {
    return `${live.topic} · ${status} · ${RESEARCH_RESULT_SOURCE_LABEL[live.result.source]}`;
  }
  if (live.status === "sent") {
    return `${live.topic} · ${status} · record controlled result when ready`;
  }
  if (live.status === "ready") {
    return `${live.topic} · ${status} · approve to send`;
  }
  if (live.status === "failed") {
    return `${live.topic} · ${status}${live.error ? ` — ${live.error}` : ""}`;
  }
  return `${live.topic} · ${status} · ${RESEARCH_DISPATCH_MODE_LABEL[live.dispatchMode]}`;
}

export function researchAssignmentWorkflowClosed(assignment: ResearchAssignment): boolean {
  const live = resolveLiveResearchAssignment(assignment) ?? assignment;
  return live.status === "completed" || live.status === "failed";
}

/** Empty-state copy when no research assignments exist in the active scope. */
export const RESEARCH_ASSIGNMENT_EMPTY_STATE = {
  lead: "No research assignments",
  description:
    "Ask Chief to research a topic for the selected project. Dispatch stays approval-gated and local_controlled until a live researcher backend exists.",
} as const;
