import {
  APPROVAL_GATES,
  createApprovalCardFromPlannerRequest,
  type PlannerApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ChiefLiveContext } from "./chiefLiveContext";
import type { ApprovalCard, ApprovalProposal } from "./types";

/**
 * Planner signal — real, not illustrative.
 *
 * Source: `ChiefLiveContext.overdueTasks`, the live set of open tasks already
 * past their `dueAt` (derived in buildChiefLiveContext from the same task data
 * the dashboard renders — real when Supabase is configured, mock otherwise).
 * When open work is overdue, the current sequencing isn't holding, which is
 * exactly the Planner "Roadmap reprioritization or re-sequencing" gate.
 * Planner never asks the operator directly: it builds a PlannerApprovalRequest
 * and routes it through createApprovalCardFromPlannerRequest() ->
 * addCommandApproval() -> the shared Chief queue, same as Build's real request
 * and Research's incident packet.
 *
 * No new approval surface, route, queue, or schema — this only produces a card
 * for the existing queue, and only when the live signal is actually present.
 */

/** Stable id so repeat proposes dedupe while one is pending. */
export const PLANNER_REPRIORITIZATION_PROPOSAL_ID = stableChiefId(
  "apr-planner-reprioritization",
  "roadmap-resequence-overdue",
);

export type PlannerReprioritizationResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" }
  | { outcome: "no_signal" };

function affectedPhasesFromOverdue(context: ChiefLiveContext): string[] {
  const types = new Set(context.overdueTasks.map((task) => task.workflowType));
  return [...types].sort().map((type) => `${type} workflow`);
}

export function buildPlannerReprioritizationRequest(
  context: ChiefLiveContext,
  createdAt: string = new Date().toISOString(),
): PlannerApprovalRequest {
  const overdue = context.overdueTasks;
  const affectedPhases = affectedPhasesFromOverdue(context);
  const sample = overdue
    .slice(0, 3)
    .map((task) => `${task.title} (${task.id})`)
    .join(", ");

  return {
    id: PLANNER_REPRIORITIZATION_PROPOSAL_ID,
    gate: APPROVAL_GATES.planner[2],
    summary: `${overdue.length} open task${overdue.length === 1 ? "" : "s"} past due across ${affectedPhases.length} workflow type${affectedPhases.length === 1 ? "" : "s"} (${affectedPhases.join(", ")}). Planner proposes re-sequencing current priorities to clear the overdue work first. Examples: ${sample}.`,
    riskLevel: "medium",
    testsOrChecksDone: [
      {
        label: `Confirmed ${overdue.length} open task(s) past dueAt from live context`,
        status: "pass",
      },
      {
        label: "Signal derived from live task data, not a fixture",
        status: "pass",
      },
      { label: "Operator review before any re-sequencing", status: "pending" },
    ],
    requestedAction:
      "Approve re-sequencing the roadmap to prioritize the overdue work, or hold to keep the current order.",
    affectedPhases,
    createdAt,
  };
}

export function hasPendingPlannerReprioritizationProposal(
  approvals: ApprovalProposal[],
): boolean {
  return approvals.some(
    (proposal) =>
      proposal.id === PLANNER_REPRIORITIZATION_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime signal slice: enqueue a Planner re-sequencing proposal when the live
 * context shows overdue open work. Returns `no_signal` (no card) when there's
 * nothing overdue — truthful, never a placeholder card. Caller passes the
 * shared approvals queue and addCommandApproval from ChiefApprovalsContext.
 */
export function proposePlannerReprioritization(
  context: ChiefLiveContext,
  approvals: ApprovalProposal[],
): PlannerReprioritizationResult {
  if (context.overdueTasks.length === 0) {
    return { outcome: "no_signal" };
  }
  if (hasPendingPlannerReprioritizationProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromPlannerRequest(buildPlannerReprioritizationRequest(context));
  return { outcome: "queued", card };
}
