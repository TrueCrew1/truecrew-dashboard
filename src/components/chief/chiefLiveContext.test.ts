import { describe, expect, it } from "vitest";
import type { PlannerWorkItem } from "@/types/plannerWorkItems";
import { derivePlannerAgentWorkItems, derivePlannerReadyBuildWorkItems } from "./chiefLiveContext";

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

function plannerBuildWorkItem(overrides: Partial<PlannerWorkItem> = {}): PlannerWorkItem {
  return {
    id: "planner-work-1",
    title: "Wire the settings page",
    description: "Backend route exists; needs UI.",
    status: "new",
    priority: "medium",
    assignee: null,
    dueDate: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("derivePlannerReadyBuildWorkItems", () => {
  it("maps a new work item to a queued Build Agent card", () => {
    const [item] = derivePlannerReadyBuildWorkItems([plannerBuildWorkItem()]);

    expect(item).toEqual({
      id: "agentwork-planner-build-planner-work-1",
      agent: "Build Agent",
      task: "Build: Wire the settings page",
      status: "queued",
      priority: "medium",
      note: "Backend route exists; needs UI.",
      updatedAt: "2026-07-10T00:00:00.000Z",
      source: "live",
    });
  });

  it("maps in_progress to active status", () => {
    const [item] = derivePlannerReadyBuildWorkItems([
      plannerBuildWorkItem({ status: "in_progress" }),
    ]);

    expect(item.status).toBe("active");
  });

  it("maps blocked to blocked status", () => {
    const [item] = derivePlannerReadyBuildWorkItems([plannerBuildWorkItem({ status: "blocked" })]);

    expect(item.status).toBe("blocked");
  });

  it("maps done to completed status", () => {
    const [item] = derivePlannerReadyBuildWorkItems([plannerBuildWorkItem({ status: "done" })]);

    expect(item.status).toBe("completed");
  });

  it("falls back to a generic note when no description is set", () => {
    const [item] = derivePlannerReadyBuildWorkItems([
      plannerBuildWorkItem({ description: null }),
    ]);

    expect(item.note).toBe("No description provided.");
  });

  it("passes priority through unchanged", () => {
    const [item] = derivePlannerReadyBuildWorkItems([plannerBuildWorkItem({ priority: "high" })]);

    expect(item.priority).toBe("high");
  });
});
