import { describe, expect, it } from "vitest";
import {
  APPROVAL_GATES,
  createApprovalCardFromPlannerRequest,
} from "@/components/chief/agentApprovalGates";
import {
  PLANNER_REPRIORITIZATION_PROPOSAL_ID,
  buildPlannerReprioritizationRequest,
  proposePlannerReprioritization,
} from "@/components/chief/plannerReprioritizationProposal";
import type { ChiefLiveContext } from "@/components/chief/chiefLiveContext";
import type { ApprovalProposal } from "@/components/chief/types";
import { WorkflowStage, type Task } from "@/types";

function task(id: string, title: string, workflowType: Task["workflowType"]): Task {
  return {
    id,
    title,
    description: "",
    stage: WorkflowStage.InProgress,
    workflowType,
    priority: "medium",
    gates: [],
    linkedEntities: [],
    dueAt: "2020-01-01T00:00:00.000Z",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    createdBy: "operator",
  };
}

function contextWith(overdueTasks: Task[]): ChiefLiveContext {
  return {
    stats: {} as ChiefLiveContext["stats"],
    focusItems: [],
    alerts: [],
    openTaskCount: overdueTasks.length,
    blockingTasks: [],
    overdueTasks,
    tasksMissingCustomer: [],
    tasksMissingWorkflow: [],
    activeIncidents: [],
    blockedDeploys: [],
    waitingCustomers: [],
  };
}

const CREATED_AT = "2026-07-10T00:00:00.000Z";

describe("proposePlannerReprioritization", () => {
  it("returns no_signal when overdueTasks is empty", () => {
    const result = proposePlannerReprioritization(contextWith([]), []);
    expect(result).toEqual({ outcome: "no_signal" });
  });

  it("queues and routes as planner_agent", () => {
    const context = contextWith([
      task("t-1", "Replace pump seal", "repair"),
      task("t-2", "Ship deploy", "deploy"),
    ]);
    const result = proposePlannerReprioritization(context, []);
    expect(result.outcome).toBe("queued");
    if (result.outcome !== "queued") return;
    expect(result.card.id).toBe(PLANNER_REPRIORITIZATION_PROPOSAL_ID);
    expect(result.card.source).toBe("planner_agent");
    expect(result.card.status).toBe("pending");
    expect(result.card.title).toMatch(/Planner: Roadmap reprioritization/);
  });

  it("dedupes while a proposal is already pending", () => {
    const context = contextWith([task("t-1", "Replace pump seal", "repair")]);
    const pending: ApprovalProposal[] = [
      {
        id: PLANNER_REPRIORITIZATION_PROPOSAL_ID,
        title: "existing",
        summary: "",
        recommendedAction: "",
        riskNote: "",
        status: "pending",
        createdAt: CREATED_AT,
      },
    ];
    expect(proposePlannerReprioritization(context, pending)).toEqual({
      outcome: "blocked",
      reason: "already_pending",
    });
  });

  it("does not dedupe once the prior proposal is resolved", () => {
    const context = contextWith([task("t-1", "Replace pump seal", "repair")]);
    for (const status of ["approved", "rejected", "sent_back"] as const) {
      const resolved: ApprovalProposal[] = [
        {
          id: PLANNER_REPRIORITIZATION_PROPOSAL_ID,
          title: "resolved",
          summary: "",
          recommendedAction: "",
          riskNote: "",
          status,
          createdAt: CREATED_AT,
        },
      ];
      const result = proposePlannerReprioritization(context, resolved);
      expect(result.outcome).toBe("queued");
    }
  });

  it("request output is deterministic for the same input", () => {
    const context = contextWith([
      task("t-1", "Replace pump seal", "repair"),
      task("t-2", "Ship deploy", "deploy"),
      task("t-3", "Fix ticket", "repair"),
    ]);
    const first = buildPlannerReprioritizationRequest(context, CREATED_AT);
    const second = buildPlannerReprioritizationRequest(context, CREATED_AT);
    expect(first).toEqual(second);
    expect(first.affectedPhases).toEqual(["deploy workflow", "repair workflow"]);
    expect(first.summary).toMatch(/3 open tasks past due across 2 workflow types/);
  });

  it("uses the exact real gate string from APPROVAL_GATES.planner[2]", () => {
    const context = contextWith([task("t-1", "Replace pump seal", "repair")]);
    const request = buildPlannerReprioritizationRequest(context, CREATED_AT);
    expect(request.gate).toBe(APPROVAL_GATES.planner[2]);
    expect(request.gate).toBe("Roadmap reprioritization or re-sequencing");
    expect(request.gate).not.toMatch(/example|placeholder|phase 4/i);

    const card = createApprovalCardFromPlannerRequest(request);
    expect(card.title).toBe("Planner: Roadmap reprioritization or re-sequencing");
  });
});
