import type { ProjectToolScope } from "@/data/projects";
import {
  buildResearchAssignment,
  RESEARCH_ASSIGNMENT_DISPATCH_KIND,
  RESEARCH_ASSIGNMENT_LANE_LABEL,
  RESEARCH_ASSIGNMENT_STATUS_LABEL,
  type ResearchAssignment,
} from "@/lib/chief/researchAssignment";
import { stableChiefId } from "./chiefMock";
import {
  getResearchAssignment,
  linkResearchAssignmentProposal,
  upsertResearchAssignment,
} from "./researchAssignmentStore";
import {
  RESEARCH_DISPATCH_MODE_LABEL,
  RESEARCH_RESULT_SOURCE_LABEL,
  formatResearchAssignmentAuditNote,
} from "./researchAssignmentView";
import type { ChiefResponse } from "./types";

export function researchAssignmentIdFor(scope: ProjectToolScope, command: string): string {
  const draft = buildResearchAssignment({
    scope,
    command,
    assignmentId: "tmp",
  });
  return stableChiefId("ra", `${scope.projectId}|${draft.topic}|${draft.researcherLane}`);
}

export function buildResearchAssignmentGlobalRefusal(): ChiefResponse {
  return {
    summary:
      "Global has no project scope. Select a project before creating a research assignment.",
    recommendedAction:
      "Switch Project from Global to a project, then ask to research competitors or create a research assignment.",
    routedTo: "Chief",
    approvalNeeded: false,
  };
}

function existingAssignmentStatusResponse(assignment: ResearchAssignment): ChiefResponse {
  const laneLabel = RESEARCH_ASSIGNMENT_LANE_LABEL[assignment.researcherLane];
  const statusLabel = RESEARCH_ASSIGNMENT_STATUS_LABEL[assignment.status];

  if (assignment.status === "completed") {
    const sourceLabel = assignment.result
      ? RESEARCH_RESULT_SOURCE_LABEL[assignment.result.source]
      : "Controlled / local (no live backend)";
    return {
      summary: `Research workflow already complete for ${assignment.projectName}: “${assignment.topic}” (${laneLabel}). Status: ${statusLabel}. ${sourceLabel}.`,
      recommendedAction:
        "Review the recorded findings on this assignment, or ask a new research topic to open a separate assignment.",
      routedTo: "Research Agent",
      approvalNeeded: false,
      specialists: [
        {
          specialist: "Research Agent",
          contribution: `Existing completed assignment — ${formatResearchAssignmentAuditNote(assignment)}`,
        },
      ],
      researchAssignment: assignment,
    };
  }

  if (assignment.status === "sent") {
    return {
      summary: `Research assignment already sent for ${assignment.projectName}: “${assignment.topic}” (${laneLabel}). ${RESEARCH_DISPATCH_MODE_LABEL[assignment.dispatchMode]}. Record a controlled result to close the workflow.`,
      recommendedAction:
        "Record a controlled result on this assignment to close the workflow (no live researcher backend).",
      routedTo: "Research Agent",
      approvalNeeded: false,
      specialists: [
        {
          specialist: "Research Agent",
          contribution: `Existing sent assignment awaiting controlled result — ${laneLabel}`,
        },
      ],
      researchAssignment: assignment,
    };
  }

  if (assignment.status === "failed") {
    return {
      summary: `Research assignment previously failed for ${assignment.projectName}: “${assignment.topic}”. ${assignment.error ?? "No error detail."} Create a new assignment to retry.`,
      recommendedAction: "Ask a new research assignment command to open a fresh gated dispatch.",
      routedTo: "Research Agent",
      approvalNeeded: false,
      researchAssignment: assignment,
    };
  }

  // ready / draft — fall through to gated create response in caller
  return {
    summary: `Research assignment ready for ${assignment.projectName}: “${assignment.topic}” → ${laneLabel}. Not sent yet — approval required to dispatch (${RESEARCH_DISPATCH_MODE_LABEL[assignment.dispatchMode]}).`,
    recommendedAction: `Review the assignment, then approve to send it to the Research Agent lane.`,
    routedTo: "Research Agent",
    approvalNeeded: true,
    approvalTitle: `Send research assignment: ${assignment.topic}`,
    approvalPrompt: `Approve sending “${assignment.topic}” to ${laneLabel}`,
    riskNote:
      "Dispatch is gated. Approving marks the assignment sent in local_controlled mode — it does not invent a background researcher run. Record a result after send.",
    specialists: [
      {
        specialist: "Research Agent",
        contribution: `Prepared ${laneLabel} assignment for ${assignment.projectName} (send pending approval)`,
      },
    ],
    approvalPacket: {
      recommendation: `Approve to send “${assignment.topic}” to the Research Agent lane.`,
      riskLevel: "low",
      rationale:
        "Research dispatch changes operator workload and should be an explicit decision. This slice is local/controlled — no autonomous swarm.",
      evidence: [
        `Project: ${assignment.projectName}`,
        `Lane: ${laneLabel}`,
        `Requested output: ${assignment.requestedOutput}`,
        `Mission: ${RESEARCH_ASSIGNMENT_DISPATCH_KIND}`,
        `Mode: ${assignment.dispatchMode}`,
      ],
      nextAction:
        "Approve to send (local_controlled), then record a controlled result to close the workflow.",
      improvementsMade: [
        "Assignment created before send",
        "Send gated behind approval",
        "Honest local_controlled dispatch — no fake backend run",
        "Result recording closes the workflow explicitly",
      ],
    },
    researchAssignment: assignment,
  };
}

export function buildResearchAssignmentResponse(input: {
  scope: ProjectToolScope;
  command: string;
  now?: Date;
}): ChiefResponse {
  const assignmentId = researchAssignmentIdFor(input.scope, input.command);
  const existingLive = getResearchAssignment(assignmentId);
  if (
    existingLive &&
    (existingLive.status === "sent" ||
      existingLive.status === "completed" ||
      existingLive.status === "failed")
  ) {
    // Live store is source of truth — do not invent a fresh "ready to send" story.
    return existingAssignmentStatusResponse(existingLive);
  }

  const built = buildResearchAssignment({
    scope: input.scope,
    command: input.command,
    assignmentId,
    now: input.now,
  });
  const assignment = upsertResearchAssignment(built);
  return existingAssignmentStatusResponse(assignment);
}

export function attachResearchAssignmentProposalId(
  assignment: ResearchAssignment,
  proposalId: string,
): ResearchAssignment {
  return linkResearchAssignmentProposal(assignment.id, proposalId) ?? {
    ...assignment,
    proposalId,
  };
}
