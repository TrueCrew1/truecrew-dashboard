import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPlannerTaskPayloadFromProposal,
  enqueuePlannerWorkItem,
  getPlannerWorkItems,
  plannerTaskIdempotencyKey,
} from "@/lib/api/plannerRuntime";

describe("plannerTaskIdempotencyKey", () => {
  it("builds a stable, namespaced key from a proposal id", () => {
    expect(plannerTaskIdempotencyKey("apr-planner-example-phase4")).toBe(
      "planner:planning_task:apr-planner-example-phase4",
    );
  });
});

describe("buildPlannerTaskPayloadFromProposal", () => {
  it("maps proposal fields into a PlannerTaskPayload", () => {
    const payload = buildPlannerTaskPayloadFromProposal({
      proposalId: "apr-planner-example-phase4",
      title: "Start Phase 4 — Alerts & Escalation",
      summary: "Urgency buckets and inline tags on pending approvals.",
      recommendedAction: "Approve starting Phase 4 planning.",
      riskNote: "Medium risk — scope not yet fully estimated.",
      decisionLabel: "Approved",
    });

    expect(payload).toEqual({
      title: "Start Phase 4 — Alerts & Escalation",
      description: "Approved. Approve starting Phase 4 planning.",
      context: "Urgency buckets and inline tags on pending approvals.",
      notes: "Medium risk — scope not yet fully estimated.",
    });
  });
});

describe("getPlannerWorkItems / enqueuePlannerWorkItem", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("getPlannerWorkItems sends the internal auth header and returns workItems", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: "plan-1" }] }),
    });

    const items = await getPlannerWorkItems(10);

    expect(items).toEqual([{ id: "plan-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runtime/planner/work-items?limit=10",
      { headers: { "x-internal-key": "test-secret" } },
    );
  });

  it("getPlannerWorkItems throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getPlannerWorkItems()).rejects.toThrow(
      /Planner work items API returned 500/,
    );
  });

  it("enqueuePlannerWorkItem POSTs the payload and returns the created work item", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItem: { id: "plan-2" }, created: true }),
    });

    const result = await enqueuePlannerWorkItem({
      chiefProposalId: "apr-planner-example-phase4",
      idempotencyKey: "planner:planning_task:apr-planner-example-phase4",
      inputPayload: { title: "Start Phase 4", description: "Kick off Phase 4." },
    });

    expect(result).toEqual({ workItem: { id: "plan-2" }, created: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runtime/planner/work-items",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("enqueuePlannerWorkItem throws the API error message when the response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "planning_task payload requires title" }),
    });

    await expect(
      enqueuePlannerWorkItem({
        chiefProposalId: "apr-planner-example-phase4",
        idempotencyKey: "planner:planning_task:apr-planner-example-phase4",
        inputPayload: { title: "", description: "" },
      }),
    ).rejects.toThrow(/planning_task payload requires title/);
  });
});
