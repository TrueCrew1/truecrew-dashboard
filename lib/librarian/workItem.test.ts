import { describe, expect, it } from "vitest";
import { WorkflowStage, type GateCheck } from "../../src/types";
import { isObsidianFilingCandidate, workItemFromTask } from "./workItem";
import { makeTask } from "./test-support";

const passedGate: GateCheck = { id: "g1", label: "CI green", required: true, passed: true };
const openGate: GateCheck = { id: "g2", label: "Approval", required: true, passed: false };

describe("isObsidianFilingCandidate", () => {
  it("is true only for Done/Logged stages", () => {
    expect(isObsidianFilingCandidate(makeTask({ stage: WorkflowStage.Done }))).toBe(true);
    expect(isObsidianFilingCandidate(makeTask({ stage: WorkflowStage.Logged }))).toBe(true);
    expect(isObsidianFilingCandidate(makeTask({ stage: WorkflowStage.InProgress }))).toBe(false);
  });
});

describe("workItemFromTask", () => {
  it("is 'filed' whenever an artifact already exists, regardless of stage", () => {
    const item = workItemFromTask(makeTask({ stage: WorkflowStage.InProgress }), true);
    expect(item.status).toBe("filed");
    expect(item.type).toBe("obsidian_filing");
  });

  it("is 'pending' when the task is not yet in a filing stage", () => {
    const item = workItemFromTask(makeTask({ stage: WorkflowStage.Triage }), false);
    expect(item.status).toBe("pending");
  });

  it("is 'blocked' when a filing-stage task has a blocker", () => {
    const item = workItemFromTask(
      makeTask({ stage: WorkflowStage.Done, blocker: "awaiting sign-off" }),
      false,
    );
    expect(item.status).toBe("blocked");
  });

  it("is 'blocked' when a filing-stage task has an open required gate", () => {
    const item = workItemFromTask(
      makeTask({ stage: WorkflowStage.Done, blocker: undefined, gates: [openGate] }),
      false,
    );
    expect(item.status).toBe("blocked");
  });

  it("is 'active' when a filing-stage task is clean (no blocker, no open gates)", () => {
    const item = workItemFromTask(
      makeTask({ stage: WorkflowStage.Logged, blocker: undefined, gates: [passedGate] }),
      false,
    );
    expect(item.status).toBe("active");
  });
});
