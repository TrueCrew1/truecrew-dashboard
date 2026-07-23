import {
  APPROVAL_GATES,
  createApprovalCardFromPlannerRequest,
  type PlannerApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ChiefLiveContext } from "./chiefLiveContext";
import type { ApprovalCard, ApprovalProposal } from "./types";
import type { FocusItem } from "@/types";

/**
 * Planner signal — real, not illustrative.
 *
 * Gate: APPROVAL_GATES.planner[1] — "New roadmap phase".
 *
 * Source: decision-type items already on ChiefLiveContext.focusItems (the
 * same focus queue the Today page and Chief board read). Chief already
 * attributes decision focus items to Roadmap Agent elsewhere in
 * chiefLiveContext.ts; when any exist, starting or advancing a roadmap
 * phase is a genuine Planner judgment call — not a fixture.
 *
 * Path: PlannerApprovalRequest → createApprovalCardFromPlannerRequest() →
 * addCommandApproval() → shared Chief queue. No new surface, route, or schema.
 */

/** Stable id so repeat proposes dedupe while one is pending. */
export const PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID = stableChiefId(
  "apr-planner-new-phase",
  "focus-decision-new-roadmap-phase",
);

export type PlannerNewRoadmapPhaseResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" }
  | { outcome: "no_signal" };

export function decisionFocusItems(context: ChiefLiveContext): FocusItem[] {
  return context.focusItems.filter((item) => item.workflowType === "decision");
}

export function buildPlannerNewRoadmapPhaseRequest(
  context: ChiefLiveContext,
  createdAt: string = new Date().toISOString(),
): PlannerApprovalRequest {
  const decisions = decisionFocusItems(context);
  const affectedPhases = decisions.map((item) => item.title).sort();
  const sample = decisions
    .slice(0, 3)
    .map((item) => `${item.title} (${item.taskId}: ${item.reason})`)
    .join("; ");

  return {
    id: PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID,
    gate: APPROVAL_GATES.planner[1],
    summary: `${decisions.length} decision focus item${decisions.length === 1 ? "" : "s"} on the live queue. Planner proposes starting or advancing a roadmap phase tied to that pending decision work. Examples: ${sample}.`,
    riskLevel: "medium",
    testsOrChecksDone: [
      {
        label: `Confirmed ${decisions.length} decision focus item(s) from live context`,
        status: "pass",
      },
      {
        label: "Signal derived from focusItems workflowType=decision, not a fixture",
        status: "pass",
      },
      { label: "Operator review before starting a new roadmap phase", status: "pending" },
    ],
    requestedAction:
      "Approve starting the new roadmap phase tied to the pending decision(s), or hold to keep the current phase boundary.",
    affectedPhases,
    createdAt,
  };
}

export function hasPendingPlannerNewRoadmapPhaseProposal(
  approvals: ApprovalProposal[],
): boolean {
  return approvals.some(
    (proposal) =>
      proposal.id === PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime signal: enqueue a Planner "New roadmap phase" proposal when the
 * live focus queue holds decision-type items. Returns `no_signal` when none
 * exist. Caller uses addCommandApproval from ChiefApprovalsContext.
 */
export function proposePlannerNewRoadmapPhase(
  context: ChiefLiveContext,
  approvals: ApprovalProposal[],
): PlannerNewRoadmapPhaseResult {
  if (decisionFocusItems(context).length === 0) {
    return { outcome: "no_signal" };
  }
  if (hasPendingPlannerNewRoadmapPhaseProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromPlannerRequest(
    buildPlannerNewRoadmapPhaseRequest(context),
  );
  return { outcome: "queued", card };
}
