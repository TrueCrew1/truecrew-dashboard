import { describe, expect, it } from "vitest";
import { derivePlannerAgentWorkItems } from "./chiefLiveContext";

function workItem(overrides: Partial<Parameters<typeof derivePlannerAgentWorkItems>[0][number]>) {
  return {
    id: "wi-1",
    inputPayload: { title: "Start Phase 4 — Alerts & Escalation" },
    status: "queued",
    updatedAt: "2026-07-10T00:00:00.000Z",
    latestObsidianPath: null,
    ...overrides,
  };
}

describe("derivePlannerAgentWorkItems", () => {
  it("maps a queued work item to a live Roadmap Agent card", () => {
    const [item] = derivePlannerAgentWorkItems([workItem({})]);

    expect(item).toEqual({
      id: "agentwork-planner-wi-1",
      agent: "Roadmap Agent",
      task: "Plan: Start Phase 4 — Alerts & Escalation",
      status: "queued",
      priority: "medium",
      note: "Queued — run npm run planner:run locally.",
      updatedAt: "2026-07-10T00:00:00.000Z",
      source: "live",
    });
  });

  it("maps a running work item to active status", () => {
    const [item] = derivePlannerAgentWorkItems([workItem({ status: "running" })]);

    expect(item.status).toBe("active");
    expect(item.note).toBe("Filing in progress locally.");
  });

  it("maps a completed work item with a vault path", () => {
    const [item] = derivePlannerAgentWorkItems([
      workItem({ status: "completed", latestObsidianPath: "Operations/Planning/note.md" }),
    ]);

    expect(item.status).toBe("completed");
    expect(item.note).toBe("Filed to vault — Operations/Planning/note.md");
  });

  it("maps a completed work item with no vault path yet", () => {
    const [item] = derivePlannerAgentWorkItems([workItem({ status: "completed" })]);

    expect(item.note).toBe("Filed to vault.");
  });

  it("maps a failed work item to blocked status", () => {
    const [item] = derivePlannerAgentWorkItems([workItem({ status: "failed" })]);

    expect(item.status).toBe("blocked");
    expect(item.priority).toBe("high");
    expect(item.note).toBe("Filing failed — review work item and retry.");
  });
});
