import { describe, expect, it } from "vitest";
import {
  APPROVAL_GATES,
  createApprovalCardFromPlannerRequest,
} from "@/components/chief/agentApprovalGates";
import {
  PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID,
  buildPlannerNewRoadmapPhaseRequest,
  proposePlannerNewRoadmapPhase,
} from "@/components/chief/plannerNewRoadmapPhaseProposal";
import type { ChiefLiveContext } from "@/components/chief/chiefLiveContext";
import type { ApprovalProposal } from "@/components/chief/types";
import { WorkflowStage, type FocusItem } from "@/types";

function focus(
  id: string,
  title: string,
  workflowType: FocusItem["workflowType"],
  reason = "Pending decision",
): FocusItem {
  return {
    id,
    taskId: `task-${id}`,
    title,
    stage: WorkflowStage.Review,
    workflowType,
    reason,
  };
}

function contextWith(focusItems: FocusItem[]): ChiefLiveContext {
  return {
    stats: {} as ChiefLiveContext["stats"],
    focusItems,
    alerts: [],
    openTaskCount: 0,
    blockingTasks: [],
    overdueTasks: [],
    tasksMissingCustomer: [],
    tasksMissingWorkflow: [],
    activeIncidents: [],
    blockedDeploys: [],
    waitingCustomers: [],
  };
}

const CREATED_AT = "2026-07-23T00:00:00.000Z";

describe("proposePlannerNewRoadmapPhase", () => {
  it("returns no_signal when there are no decision focus items", () => {
    const result = proposePlannerNewRoadmapPhase(
      contextWith([focus("f-1", "Build rate limiter", "build")]),
      [],
    );
    expect(result).toEqual({ outcome: "no_signal" });
  });

  it("queues and routes as planner_agent", () => {
    const context = contextWith([
      focus("f-1", "Q3 pricing model decision", "decision", "Blocks Q3 planning"),
      focus("f-2", "Auth repair", "repair"),
    ]);
    const result = proposePlannerNewRoadmapPhase(context, []);
    expect(result.outcome).toBe("queued");
    if (result.outcome !== "queued") return;
    expect(result.card.id).toBe(PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID);
    expect(result.card.source).toBe("planner_agent");
    expect(result.card.status).toBe("pending");
    expect(result.card.title).toBe("Planner: New roadmap phase");
  });

  it("dedupes while a proposal is already pending", () => {
    const context = contextWith([focus("f-1", "Q3 pricing model decision", "decision")]);
    const pending: ApprovalProposal[] = [
      {
        id: PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID,
        title: "existing",
        summary: "",
        recommendedAction: "",
        riskNote: "",
        status: "pending",
        createdAt: CREATED_AT,
      },
    ];
    expect(proposePlannerNewRoadmapPhase(context, pending)).toEqual({
      outcome: "blocked",
      reason: "already_pending",
    });
  });

  it("does not dedupe once the prior proposal is resolved", () => {
    const context = contextWith([focus("f-1", "Q3 pricing model decision", "decision")]);
    for (const status of ["approved", "rejected", "sent_back"] as const) {
      const resolved: ApprovalProposal[] = [
        {
          id: PLANNER_NEW_ROADMAP_PHASE_PROPOSAL_ID,
          title: "resolved",
          summary: "",
          recommendedAction: "",
          riskNote: "",
          status,
          createdAt: CREATED_AT,
        },
      ];
      expect(proposePlannerNewRoadmapPhase(context, resolved).outcome).toBe("queued");
    }
  });

  it("request output is deterministic for the same input", () => {
    const context = contextWith([
      focus("f-2", "Phase 4 alerts decision", "decision", "Alerts phase"),
      focus("f-1", "Q3 pricing model decision", "decision", "Blocks Q3"),
    ]);
    const first = buildPlannerNewRoadmapPhaseRequest(context, CREATED_AT);
    const second = buildPlannerNewRoadmapPhaseRequest(context, CREATED_AT);
    expect(first).toEqual(second);
    expect(first.affectedPhases).toEqual([
      "Phase 4 alerts decision",
      "Q3 pricing model decision",
    ]);
    expect(first.summary).toMatch(/2 decision focus items/);
  });

  it("uses the exact real gate string from APPROVAL_GATES.planner[1]", () => {
    const context = contextWith([focus("f-1", "Q3 pricing model decision", "decision")]);
    const request = buildPlannerNewRoadmapPhaseRequest(context, CREATED_AT);
    expect(request.gate).toBe(APPROVAL_GATES.planner[1]);
    expect(request.gate).toBe("New roadmap phase");
    expect(request.gate).not.toMatch(/example|placeholder/i);

    const card = createApprovalCardFromPlannerRequest(request);
    expect(card.title).toBe("Planner: New roadmap phase");
  });
});
