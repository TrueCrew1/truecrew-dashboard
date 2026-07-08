import { describe, expect, it } from "vitest";
import { deterministicArtifactDraft } from "../lib/librarian/refine.deterministic.js";
import { workflowTypeToNoteType } from "../lib/librarian/types.js";
import { WorkflowStage } from "../src/types/index.js";
import { makeTask } from "./fixtures.js";

describe("workflowTypeToNoteType", () => {
  it("maps known workflow types to note categories", () => {
    expect(workflowTypeToNoteType("build")).toBe("build");
    expect(workflowTypeToNoteType("deploy")).toBe("deploy");
    expect(workflowTypeToNoteType("repair")).toBe("incident");
    expect(workflowTypeToNoteType("ticket")).toBe("ticket");
    expect(workflowTypeToNoteType("onboarding")).toBe("onboarding");
    expect(workflowTypeToNoteType("decision")).toBe("decision");
  });
});

describe("deterministicArtifactDraft", () => {
  it("builds a titled work-record draft from the task description", () => {
    const task = makeTask({
      title: "Rebuild pump seal",
      description: "Seal failed; needs replacement",
      workflowType: "repair",
      stage: WorkflowStage.InProgress,
      priority: "medium",
    });
    const draft = deterministicArtifactDraft(task);

    expect(draft.title).toBe("Rebuild pump seal — work record");
    expect(draft.summary).toBe("Seal failed; needs replacement");
    expect(draft.noteType).toBe("incident");
    expect(draft.pathSegment).toBe("Rebuild pump seal");
    expect(draft.tags).toEqual(["repair", "in-progress", "librarian"]);
  });

  it("falls back to the blocker then to a synthesized summary", () => {
    const withBlocker = makeTask({ description: "  ", blocker: "Awaiting parts" });
    expect(deterministicArtifactDraft(withBlocker).summary).toBe("Awaiting parts");

    const withNothing = makeTask({
      description: "",
      blocker: "",
      workflowType: "build",
      stage: WorkflowStage.Planned,
    });
    expect(deterministicArtifactDraft(withNothing).summary).toBe(
      "build work item at stage Planned.",
    );
  });

  it("appends critical/high priority as a tag", () => {
    const critical = makeTask({ priority: "critical", workflowType: "repair" });
    expect(deterministicArtifactDraft(critical).tags).toContain("critical");

    const low = makeTask({ priority: "low", workflowType: "repair" });
    expect(deterministicArtifactDraft(low).tags).not.toContain("low");
  });

  it("truncates long summaries to 240 characters", () => {
    const task = makeTask({ description: "x".repeat(400) });
    const summary = deterministicArtifactDraft(task).summary;
    expect(summary).toHaveLength(240);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("collapses whitespace in the summary source", () => {
    const task = makeTask({ description: "line one\n\n   line   two" });
    expect(deterministicArtifactDraft(task).summary).toBe("line one line two");
  });
});
