import type { ApprovalProposal } from "./types";
import { RESEARCH_ASSIGNMENT_DISPATCH_KIND } from "@/lib/chief/researchAssignment";
import {
  getResearchAssignment,
  sendResearchAssignment,
  upsertResearchAssignment,
  type ResearchAssignmentTransitionOutcome,
} from "./researchAssignmentStore";

export function isResearchAssignmentDispatchProposal(proposal: ApprovalProposal): boolean {
  return (
    proposal.missionKind === RESEARCH_ASSIGNMENT_DISPATCH_KIND &&
    proposal.researchAssignment !== undefined
  );
}

export type ResearchAssignmentDispatchHandled = {
  handled: true;
  ok: boolean;
  kind: ResearchAssignmentTransitionOutcome["kind"];
  message: string;
};

/**
 * After Approve, mark the research assignment sent (local_controlled).
 * Shared by ChiefPanel and ChiefHomePanel.
 *
 * Validates identity + project scope, seeds the live store from the proposal
 * snapshot when missing, then runs the idempotent send transition.
 * Proposal snapshots never remain the source of truth after this call.
 */
export function runResearchAssignmentDispatch(input: {
  proposal: ApprovalProposal;
}): { handled: false } | ResearchAssignmentDispatchHandled {
  if (!isResearchAssignmentDispatchProposal(input.proposal)) {
    return { handled: false };
  }

  const seed = input.proposal.researchAssignment!;
  const assignmentId = seed.id?.trim();
  if (!assignmentId) {
    return {
      handled: true,
      ok: false,
      kind: "failed",
      message: "Research assignment missing id — cannot dispatch.",
    };
  }

  if (!seed.projectId?.trim() || !seed.projectName?.trim()) {
    return {
      handled: true,
      ok: false,
      kind: "failed",
      message: "Research assignment missing project scope — cannot dispatch.",
    };
  }

  // Live store owns current state. Seed only when the id is absent.
  if (!getResearchAssignment(assignmentId)) {
    upsertResearchAssignment({ ...seed, id: assignmentId });
  }

  const live = getResearchAssignment(assignmentId);
  if (!live) {
    return {
      handled: true,
      ok: false,
      kind: "failed",
      message: "Research assignment could not be loaded into the live store.",
    };
  }

  if (
    input.proposal.missionProjectId &&
    live.projectId !== input.proposal.missionProjectId
  ) {
    return {
      handled: true,
      ok: false,
      kind: "failed",
      message: `Project scope mismatch — assignment is for “${live.projectName}”, proposal targets another project.`,
    };
  }

  const outcome = sendResearchAssignment({ assignmentId });
  return {
    handled: true,
    ok: outcome.ok,
    kind: outcome.kind,
    message: outcome.message,
  };
}
