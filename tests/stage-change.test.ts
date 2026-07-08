import { describe, expect, it } from "vitest";
import {
  buildStageChangeConfirmMessage,
  buildStageChangeConfirmOptions,
  formatOpenGateSummary,
  getBlockingGates,
  resolveStageChange,
  resolveTaskGates,
  shouldConfirmStageChange,
  stageChangeRequiresGateWarning,
} from "../lib/stage-change.js";
import { WorkflowStage } from "../src/types/index.js";
import { makeGate } from "./fixtures.js";

const openGate = makeGate({ label: "CI green", required: true, passed: false });
const passedGate = makeGate({ label: "PR opened", required: true, passed: true });
const optionalOpenGate = makeGate({ label: "Docs", required: false, passed: false });

describe("resolveTaskGates", () => {
  const tasks = [{ id: "t1", gates: [openGate] }];
  const workflows = [
    { id: "w1", linkedTaskIds: ["t1"], gates: [passedGate] },
    { id: "w2", linkedTaskIds: [], gates: [passedGate] },
  ];

  it("returns a task's own gates when the id is a task", () => {
    expect(resolveTaskGates("t1", tasks, workflows)).toEqual([openGate]);
  });

  it("returns the linked task's gates for a workflow", () => {
    expect(resolveTaskGates("w1", tasks, workflows)).toEqual([openGate]);
  });

  it("falls back to the workflow's own gates when no linked task", () => {
    expect(resolveTaskGates("w2", tasks, workflows)).toEqual([passedGate]);
  });

  it("returns an empty array for an unknown id", () => {
    expect(resolveTaskGates("nope", tasks, workflows)).toEqual([]);
  });
});

describe("getBlockingGates", () => {
  it("keeps only required, unpassed gates", () => {
    expect(getBlockingGates([openGate, passedGate, optionalOpenGate])).toEqual([openGate]);
  });
});

describe("stageChangeRequiresGateWarning", () => {
  it("is true for Review, Done, Logged", () => {
    expect(stageChangeRequiresGateWarning(WorkflowStage.Review)).toBe(true);
    expect(stageChangeRequiresGateWarning(WorkflowStage.Done)).toBe(true);
    expect(stageChangeRequiresGateWarning(WorkflowStage.Logged)).toBe(true);
  });

  it("is false for non-target stages", () => {
    expect(stageChangeRequiresGateWarning(WorkflowStage.InProgress)).toBe(false);
  });
});

describe("formatOpenGateSummary", () => {
  it("returns an empty string when nothing is blocking", () => {
    expect(formatOpenGateSummary([])).toBe("");
  });

  it("summarizes the blocking gate labels", () => {
    expect(formatOpenGateSummary([openGate])).toBe(
      "1 required gate(s) still open: CI green.",
    );
  });
});

describe("buildStageChangeConfirmMessage", () => {
  it("returns null for Review when nothing is blocking", () => {
    expect(buildStageChangeConfirmMessage(WorkflowStage.Review, [])).toBeNull();
  });

  it("warns for Review when gates are open", () => {
    const msg = buildStageChangeConfirmMessage(WorkflowStage.Review, [openGate]);
    expect(msg).toContain("Move to Review anyway?");
    expect(msg).toContain("CI green");
  });

  it("always confirms Done, noting unresolved gates when present", () => {
    expect(buildStageChangeConfirmMessage(WorkflowStage.Done, [])).toContain(
      "Move to Done?",
    );
    expect(buildStageChangeConfirmMessage(WorkflowStage.Done, [openGate])).toContain(
      "Open gates will remain unresolved.",
    );
  });

  it("always confirms Logged as an archive action", () => {
    expect(buildStageChangeConfirmMessage(WorkflowStage.Logged, [])).toContain(
      "archives the task",
    );
  });

  it("returns null for a non-gated stage", () => {
    expect(buildStageChangeConfirmMessage(WorkflowStage.InProgress, [openGate])).toBeNull();
  });
});

describe("buildStageChangeConfirmOptions", () => {
  it("marks close-out focus on confirm when no gates block", () => {
    const opts = buildStageChangeConfirmOptions(WorkflowStage.Done, []);
    expect(opts).toMatchObject({
      title: "Confirm close-out",
      confirmLabel: "Move to Done",
      defaultFocus: "confirm",
    });
  });

  it("defaults focus to cancel when gates remain", () => {
    const opts = buildStageChangeConfirmOptions(WorkflowStage.Logged, [openGate]);
    expect(opts).toMatchObject({
      title: "Open gates remain",
      defaultFocus: "cancel",
    });
  });

  it("returns null when there is no message", () => {
    expect(buildStageChangeConfirmOptions(WorkflowStage.Review, [])).toBeNull();
  });
});

describe("shouldConfirmStageChange", () => {
  it("always confirms close-out stages", () => {
    expect(shouldConfirmStageChange(WorkflowStage.Done, [])).toBe(true);
    expect(shouldConfirmStageChange(WorkflowStage.Logged, [])).toBe(true);
  });

  it("confirms Review only when gates block", () => {
    expect(shouldConfirmStageChange(WorkflowStage.Review, [])).toBe(false);
    expect(shouldConfirmStageChange(WorkflowStage.Review, [openGate])).toBe(true);
  });

  it("does not confirm non-gated stages", () => {
    expect(shouldConfirmStageChange(WorkflowStage.InProgress, [openGate])).toBe(false);
  });
});

describe("resolveStageChange", () => {
  it("resolves true without prompting when no confirmation is needed", async () => {
    let called = false;
    const result = await resolveStageChange(WorkflowStage.InProgress, [openGate], async () => {
      called = true;
      return false;
    });
    expect(result).toBe(true);
    expect(called).toBe(false);
  });

  it("delegates to the confirm callback for gated stages", async () => {
    const result = await resolveStageChange(WorkflowStage.Done, [], async () => false);
    expect(result).toBe(false);
  });

  it("passes through a confirmed decision", async () => {
    const result = await resolveStageChange(WorkflowStage.Review, [openGate], async () => true);
    expect(result).toBe(true);
  });
});
