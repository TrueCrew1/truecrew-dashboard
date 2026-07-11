import { describe, expect, it } from "vitest";
import { AGENT_DIRECTORY } from "./agentWorkBoardMock";
import { computeStatusCounts, resolveOpenAgentEntry } from "./agentWorkPresentation";
import type { AgentWorkItem } from "./types";

function workItem(overrides: Partial<AgentWorkItem> = {}): AgentWorkItem {
  return {
    id: "agentwork-1",
    agent: "Build Agent",
    task: "Ship the widget",
    status: "queued",
    priority: "medium",
    note: "Not yet started.",
    updatedAt: "2026-07-10T00:00:00.000Z",
    source: "live",
    ...overrides,
  };
}

describe("computeStatusCounts", () => {
  it("counts items by status, in status order, omitting zero counts", () => {
    const items = [
      workItem({ status: "queued" }),
      workItem({ status: "queued" }),
      workItem({ status: "completed" }),
    ];

    expect(computeStatusCounts(items)).toEqual([
      { status: "queued", label: "Queued", count: 2 },
      { status: "completed", label: "Completed", count: 1 },
    ]);
  });

  it("returns an empty list when there are no items", () => {
    expect(computeStatusCounts([])).toEqual([]);
  });
});

describe("resolveOpenAgentEntry", () => {
  it("resolves the directory entry for the selected agent", () => {
    const entry = resolveOpenAgentEntry("Build Agent", AGENT_DIRECTORY);
    expect(entry?.agent).toBe("Build Agent");
  });

  it("returns null when no agent is selected (drawer closed)", () => {
    expect(resolveOpenAgentEntry(null, AGENT_DIRECTORY)).toBeNull();
  });
});
