import { describe, expect, it } from "vitest";
import {
  APPROVAL_GATES,
  createApprovalCardFromPlannerRequest,
} from "@/components/chief/agentApprovalGates";
import {
  PLANNER_SCOPE_CHANGE_PROPOSAL_ID,
  buildPlannerScopeChangeRequest,
  proposePlannerScopeChange,
} from "@/components/chief/plannerScopeChangeProposal";
import type { ChiefLiveContext } from "@/components/chief/chiefLiveContext";
import type { ApprovalProposal } from "@/components/chief/types";
import { WorkflowStage, type GateCheck, type Task } from "@/types";

function task(
  id: string,
  title: string,
  workflowType: Task["workflowType"],
  gates: GateCheck[] = [],
  blocker?: string,
): Task {
  return {
    id,
    title,
    description: "",
    stage: WorkflowStage.InProgress,
    workflowType,
    priority: "medium",
    gates,
    linkedEntities: [],
    blocker,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    createdBy: "operator",
  };
}

const OPEN_REQUIRED_GATE: GateCheck = {
  id: "g-1",
  label: "Required check",
  required: true,
  passed: false,
};

function contextWith(blockingTasks: Task[]): ChiefLiveContext {
  return {
    stats: {} as ChiefLiveContext["stats"],
    focusItems: [],
    alerts: [],
    openTaskCount: blockingTasks.length,
    blockingTasks,
    overdueTasks: [],
    tasksMissingCustomer: [],
    tasksMissingWorkflow: [],
    activeIncidents: [],
    blockedDeploys: [],
    waitingCustomers: [],
  };
}

const CREATED_AT = "2026-07-23T00:00:00.000Z";

describe("proposePlannerScopeChange", () => {
  it("returns no_signal when no tasks are blocked", () => {
    const result = proposePlannerScopeChange(contextWith([]), []);
    expect(result).toEqual({ outcome: "no_signal" });
  });

  it("returns no_signal when blocked tasks span only one phase", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Fix another repair", "repair", [], "waiting on parts"),
    ]);
    const result = proposePlannerScopeChange(context, []);
    expect(result).toEqual({ outcome: "no_signal" });
  });

  it("queues and routes as planner_agent when blocked tasks span more than one phase", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Ship deploy", "deploy", [], "waiting on approval"),
    ]);
    const result = proposePlannerScopeChange(context, []);
    expect(result.outcome).toBe("queued");
    if (result.outcome !== "queued") return;
    expect(result.card.id).toBe(PLANNER_SCOPE_CHANGE_PROPOSAL_ID);
    expect(result.card.source).toBe("planner_agent");
    expect(result.card.status).toBe("pending");
    expect(result.card.title).toMatch(/Planner: Scope change affecting more than one phase/);
  });

  it("dedupes while a proposal is already pending", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Ship deploy", "deploy", [], "waiting on approval"),
    ]);
    const pending: ApprovalProposal[] = [
      {
        id: PLANNER_SCOPE_CHANGE_PROPOSAL_ID,
        title: "existing",
        summary: "",
        recommendedAction: "",
        riskNote: "",
        status: "pending",
        createdAt: CREATED_AT,
      },
    ];
    expect(proposePlannerScopeChange(context, pending)).toEqual({
      outcome: "blocked",
      reason: "already_pending",
    });
  });

  it("does not dedupe once the prior proposal is resolved", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Ship deploy", "deploy", [], "waiting on approval"),
    ]);
    for (const status of ["approved", "rejected", "sent_back"] as const) {
      const resolved: ApprovalProposal[] = [
        {
          id: PLANNER_SCOPE_CHANGE_PROPOSAL_ID,
          title: "resolved",
          summary: "",
          recommendedAction: "",
          riskNote: "",
          status,
          createdAt: CREATED_AT,
        },
      ];
      const result = proposePlannerScopeChange(context, resolved);
      expect(result.outcome).toBe("queued");
    }
  });

  it("request output is deterministic for the same input", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Ship deploy", "deploy", [], "waiting on approval"),
      task("t-3", "Second repair block", "repair", [OPEN_REQUIRED_GATE]),
    ]);
    const first = buildPlannerScopeChangeRequest(context, CREATED_AT);
    const second = buildPlannerScopeChangeRequest(context, CREATED_AT);
    expect(first).toEqual(second);
    expect(first.affectedPhases).toEqual(["deploy workflow", "repair workflow"]);
    expect(first.summary).toMatch(/3 open tasks blocked across 2 workflow types/);
  });

  it("uses the exact real gate string from APPROVAL_GATES.planner[0]", () => {
    const context = contextWith([
      task("t-1", "Fix gate on repair", "repair", [OPEN_REQUIRED_GATE]),
      task("t-2", "Ship deploy", "deploy", [], "waiting on approval"),
    ]);
    const request = buildPlannerScopeChangeRequest(context, CREATED_AT);
    expect(request.gate).toBe(APPROVAL_GATES.planner[0]);
    expect(request.gate).toBe("Scope change affecting more than one phase");
    expect(request.gate).not.toMatch(/example|placeholder|phase 4/i);

    const card = createApprovalCardFromPlannerRequest(request);
    expect(card.title).toBe("Planner: Scope change affecting more than one phase");
  });
});
