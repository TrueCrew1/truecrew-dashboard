import { describe, expect, it } from "vitest";
import { WorkflowStage } from "../../src/types";
import type { ArtifactDraft } from "./types";
import { renderTaskArtifactNote } from "./templates";
import { makeTask } from "./test-support";

const draft: ArtifactDraft = {
  title: "Pump station work record",
  summary: "Telemetry board swapped and recalibrated.",
  tags: ["repair", "done", "librarian"],
  pathSegment: "Pump station work record",
  noteType: "incident",
};

const path = "Operations/Artifacts/2026-07-01 — Pump station work record.md";

describe("renderTaskArtifactNote", () => {
  it("emits frontmatter carrying the note type, librarian agent and refinement source", () => {
    const md = renderTaskArtifactNote(makeTask(), draft, path, "deterministic");

    expect(md).toContain("type: incident");
    expect(md).toContain("agent: librarian");
    expect(md).toContain("refinement_source: deterministic");
    expect(md).toContain(`obsidian_path: ${path}`);
    expect(md).toContain("# Pump station work record");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Work item");
  });

  it("includes the Description and Blocker sections only when those fields are present", () => {
    const withBoth = renderTaskArtifactNote(
      makeTask({ description: "Swap board", blocker: "waiting on part" }),
      draft,
      path,
      "ai",
    );
    expect(withBoth).toContain("## Description");
    expect(withBoth).toContain("## Blocker");

    const withNeither = renderTaskArtifactNote(
      makeTask({ description: "   ", blocker: undefined }),
      draft,
      path,
      "ai",
    );
    expect(withNeither).not.toContain("## Description");
    expect(withNeither).not.toContain("## Blocker");
  });

  it("renders an Open gates section listing required, unpassed gates", () => {
    const md = renderTaskArtifactNote(
      makeTask({
        stage: WorkflowStage.Review,
        gates: [
          { id: "g1", label: "CI green", required: true, passed: true },
          { id: "g2", label: "Approval", required: true, passed: false },
        ],
      }),
      draft,
      path,
      "deterministic",
    );

    expect(md).toContain("## Open gates");
    expect(md).toContain("- Approval");
    expect(md).not.toContain("- CI green");
  });

  it("adds a GitHub section when the task carries a githubRef", () => {
    const md = renderTaskArtifactNote(
      makeTask({ githubRef: "TrueCrew1/repo#42" }),
      draft,
      path,
      "deterministic",
    );
    expect(md).toContain("## GitHub");
    expect(md).toContain("TrueCrew1/repo#42");
  });
});
