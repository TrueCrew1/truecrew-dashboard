import { describe, expect, it } from "vitest";
import { WorkflowStage } from "../../src/types";
import { deterministicArtifactDraft } from "./refine.deterministic";
import { makeTask } from "./test-support";

describe("deterministicArtifactDraft", () => {
  it("derives title, pathSegment and noteType from the task", () => {
    const draft = deterministicArtifactDraft(
      makeTask({ title: "Fix leak", workflowType: "repair" }),
    );

    expect(draft.title).toBe("Fix leak — work record");
    expect(draft.pathSegment).toBe("Fix leak");
    expect(draft.noteType).toBe("incident");
  });

  it("prefers the description as the summary source", () => {
    const draft = deterministicArtifactDraft(
      makeTask({ description: "  Replace  gasket  ", blocker: "waiting on part" }),
    );

    expect(draft.summary).toBe("Replace gasket");
  });

  it("falls back to the blocker when there is no description", () => {
    const draft = deterministicArtifactDraft(
      makeTask({ description: "   ", blocker: "waiting on part" }),
    );

    expect(draft.summary).toBe("waiting on part");
  });

  it("falls back to a generated summary when description and blocker are empty", () => {
    const draft = deterministicArtifactDraft(
      makeTask({
        description: "",
        blocker: undefined,
        workflowType: "build",
        stage: WorkflowStage.Review,
      }),
    );

    expect(draft.summary).toBe("build work item at stage Review.");
  });

  it("truncates a long summary to 240 chars with an ellipsis", () => {
    const draft = deterministicArtifactDraft(
      makeTask({ description: "x".repeat(500) }),
    );

    expect(draft.summary).toHaveLength(240);
    expect(draft.summary.endsWith("…")).toBe(true);
  });

  it("builds tags from workflow type, hyphenated stage and the librarian marker", () => {
    const draft = deterministicArtifactDraft(
      makeTask({
        workflowType: "build",
        stage: WorkflowStage.InProgress,
        priority: "medium",
      }),
    );

    expect(draft.tags).toEqual(["build", "in-progress", "librarian"]);
  });

  it("appends high/critical priority to the tags but not medium/low", () => {
    expect(
      deterministicArtifactDraft(makeTask({ priority: "critical" })).tags,
    ).toContain("critical");
    expect(
      deterministicArtifactDraft(makeTask({ priority: "high" })).tags,
    ).toContain("high");
    expect(
      deterministicArtifactDraft(makeTask({ priority: "low" })).tags,
    ).not.toContain("low");
  });
});
