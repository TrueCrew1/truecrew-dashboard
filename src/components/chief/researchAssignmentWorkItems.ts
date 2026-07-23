import type { AgentWorkItem } from "./types";
import {
  RESEARCH_ASSIGNMENT_STATUS_LABEL,
  RESEARCH_RESULT_SOURCE_LABEL,
  type ResearchAssignment,
} from "@/lib/chief/researchAssignment";
import { listResearchAssignments } from "./researchAssignmentStore";
import {
  formatResearchAssignmentBoardLine,
  resolveLiveResearchAssignment,
} from "./researchAssignmentView";

/** Map session research assignments onto Agents-tab work items. */
export function deriveResearchAssignmentWorkItems(
  assignments: ResearchAssignment[] = listResearchAssignments(),
): AgentWorkItem[] {
  return assignments.map((raw) => {
    const assignment = resolveLiveResearchAssignment(raw) ?? raw;
    const status: AgentWorkItem["status"] =
      assignment.status === "completed"
        ? "completed"
        : assignment.status === "failed"
          ? "blocked"
          : assignment.status === "sent"
            ? "active"
            : assignment.status === "ready"
              ? "awaiting_approval"
              : "queued";

    const note =
      assignment.status === "completed" && assignment.result
        ? `Complete · ${RESEARCH_RESULT_SOURCE_LABEL[assignment.result.source]}`
        : formatResearchAssignmentBoardLine(assignment);

    return {
      id: `agentwork-research-assign-${assignment.id}`,
      agent: "Research Agent",
      task: `${assignment.title} (${RESEARCH_ASSIGNMENT_STATUS_LABEL[assignment.status]})`,
      status,
      priority: assignment.researcherLane === "competitive" ? "high" : "medium",
      note,
      updatedAt:
        assignment.completedAt ??
        assignment.sentAt ??
        assignment.failedAt ??
        assignment.createdAt,
      source: "live",
    };
  });
}
