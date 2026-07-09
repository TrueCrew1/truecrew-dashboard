import { describe, expect, it } from "vitest";
import { deterministicArtifactDraft } from "./refine.deterministic.js";
import { workflowTypeToNoteType } from "./types.js";
import type { Task } from "../../src/types/index.js";
import { WorkflowStage } from "../../src/types/index.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "operator",
    title: "Replace HVAC filter",
    description: "Routine maintenance",
    stage: WorkflowStage.InProgress,
    workflowType: "repair",
    priority: "medium",
    gates: [],
    linkedEntities: [],
    ...overrides,
  };
}

describe("workflowTypeToNoteType", () => {
  it("maps each workflow type to its note category", () => {
    expect(workflowTypeToNoteType("build")).toBe("build");
    expect(workflowTypeToNoteType("deploy")).toBe("deploy");
    expect(workflowTypeToNoteType("repair")).toBe("incident");
    expect(workflowTypeToNoteType("ticket")).toBe("ticket");
    expect(workflowTypeToNoteType("onboarding")).toBe("onboarding");
    expect(workflowTypeToNoteType("decision")).toBe("decision");
  });
});

describe("deterministicArtifactDraft", () => {
  it("builds a default title, pathSegment, and note category from the task", () => {
    const task = makeTask({ title: "Rebuild pump seal", workflowType: "repair" });
    const draft = deterministicArtifactDraft(task);

    expect(draft.title).toBe("Rebuild pump seal — work record");
    expect(draft.pathSegment).toBe("Rebuild pump seal");
    expect(draft.noteType).toBe("incident");
  });

  it("tags with workflowType, a slugified stage, and 'librarian'", () => {
    const task = makeTask({ workflowType: "build", stage: WorkflowStage.InProgress, priority: "medium" });
    expect(deterministicArtifactDraft(task).tags).toEqual(["build", "in-progress", "librarian"]);
  });

  it("appends critical/high priority as an extra tag, but not medium/low", () => {
    const critical = makeTask({ priority: "critical" });
    expect(deterministicArtifactDraft(critical).tags).toContain("critical");

    const high = makeTask({ priority: "high" });
    expect(deterministicArtifactDraft(high).tags).toContain("high");

    const medium = makeTask({ priority: "medium" });
    expect(deterministicArtifactDraft(medium).tags).not.toContain("medium");

    const low = makeTask({ priority: "low" });
    expect(deterministicArtifactDraft(low).tags).not.toContain("low");
  });

  it("summarizes from the description when present", () => {
    const task = makeTask({ description: "Seal failed; needs replacement", blocker: "Awaiting parts" });
    expect(deterministicArtifactDraft(task).summary).toBe("Seal failed; needs replacement");
  });

  it("falls back to the blocker when description is blank", () => {
    const task = makeTask({ description: "   ", blocker: "Awaiting parts" });
    expect(deterministicArtifactDraft(task).summary).toBe("Awaiting parts");
  });

  it("falls back to a synthesized summary when description and blocker are both blank", () => {
    const task = makeTask({ description: "", blocker: "", workflowType: "build", stage: WorkflowStage.Planned });
    expect(deterministicArtifactDraft(task).summary).toBe("build work item at stage Planned.");
  });

  it("collapses internal whitespace in the summary source", () => {
    const task = makeTask({ description: "line one\n\n   line   two" });
    expect(deterministicArtifactDraft(task).summary).toBe("line one line two");
  });

  it("truncates summaries longer than 240 characters with a trailing ellipsis", () => {
    const task = makeTask({ description: "x".repeat(400) });
    const summary = deterministicArtifactDraft(task).summary;
    expect(summary).toHaveLength(240);
    expect(summary.endsWith("…")).toBe(true);
  });
});
