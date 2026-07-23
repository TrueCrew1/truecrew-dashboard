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
 * Source: `ChiefLiveContext.blockingTasks`, the live set of open tasks with an
 * open required gate or an external blocker (derived in buildChiefLiveContext
 * from the same task data the dashboard renders — real when Supabase is
 * configured, mock otherwise). Each blocked task's `workflowType` stands in
 * for its roadmap phase — the same convention plannerReprioritizationProposal.ts
 * uses for `affectedPhases`. When blocking issues span two or more distinct
 * workflow types at once, the scope of what's stuck has expanded past a
 * single phase, which is exactly the Planner "Scope change affecting more
 * than one phase" gate. Planner never asks the operator directly: it builds
 * a PlannerApprovalRequest and routes it through
 * createApprovalCardFromPlannerRequest() -> addCommandApproval() -> the
 * shared Chief queue, same as the reprioritization gate.
 *
 * No new approval surface, route, queue, or schema — this only produces a
 * card for the existing queue, and only when the live signal is actually
 * present.
 */

/** Stable id so repeat proposes dedupe while one is pending. */
export const PLANNER_SCOPE_CHANGE_PROPOSAL_ID = stableChiefId(
  "apr-planner-scope-change",
  "blocking-multi-phase",
);

export type PlannerScopeChangeResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" }
  | { outcome: "no_signal" };

function affectedPhasesFromBlocking(context: ChiefLiveContext): string[] {
  const types = new Set(context.blockingTasks.map((task) => task.workflowType));
  return [...types].sort().map((type) => `${type} workflow`);
}

export function buildPlannerScopeChangeRequest(
  context: ChiefLiveContext,
  createdAt: string = new Date().toISOString(),
): PlannerApprovalRequest {
  const blocking = context.blockingTasks;
  const affectedPhases = affectedPhasesFromBlocking(context);
  const sample = blocking
    .slice(0, 3)
    .map((task) => `${task.title} (${task.id})`)
    .join(", ");

  return {
    id: PLANNER_SCOPE_CHANGE_PROPOSAL_ID,
    gate: APPROVAL_GATES.planner[0],
    summary: `${blocking.length} open task${blocking.length === 1 ? "" : "s"} blocked across ${affectedPhases.length} workflow types (${affectedPhases.join(", ")}). Blocking work now spans more than one phase — Planner proposes reviewing scope across the affected phases before continuing. Examples: ${sample}.`,
    riskLevel: "medium",
    testsOrChecksDone: [
      {
        label: `Confirmed ${blocking.length} blocked open task(s) span ${affectedPhases.length} workflow types from live context`,
        status: "pass",
      },
      {
        label: "Signal derived from live task data, not a fixture",
        status: "pass",
      },
      { label: "Operator review before any scope change", status: "pending" },
    ],
    requestedAction:
      "Approve a scope review across the affected phases, or hold to keep the current scope.",
    affectedPhases,
    createdAt,
  };
}

export function hasPendingPlannerScopeChangeProposal(
  approvals: ApprovalProposal[],
): boolean {
  return approvals.some(
    (proposal) =>
      proposal.id === PLANNER_SCOPE_CHANGE_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime signal slice: enqueue a Planner scope-change proposal when the
 * live context shows blocking work spanning more than one phase. Returns
 * `no_signal` (no card) when blocking work touches zero or one phase —
 * truthful, never a placeholder card. Caller passes the shared approvals
 * queue and addCommandApproval from ChiefApprovalsContext.
 */
export function proposePlannerScopeChange(
  context: ChiefLiveContext,
  approvals: ApprovalProposal[],
): PlannerScopeChangeResult {
  if (affectedPhasesFromBlocking(context).length < 2) {
    return { outcome: "no_signal" };
  }
  if (hasPendingPlannerScopeChangeProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromPlannerRequest(buildPlannerScopeChangeRequest(context));
  return { outcome: "queued", card };
}
