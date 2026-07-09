import { afterEach, describe, expect, it, vi } from "vitest";
import { refineArtifactDraft } from "./refine.js";
import { deterministicArtifactDraft } from "./refine.deterministic.js";
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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("refineArtifactDraft", () => {
  it("returns the deterministic draft when useAi is false", async () => {
    const task = makeTask();
    const refined = await refineArtifactDraft(task, { useAi: false });

    expect(refined.refinementSource).toBe("deterministic");
    expect(refined).toMatchObject(deterministicArtifactDraft(task));
  });

  it("falls back to deterministic when useAi is true but LIBRARIAN_AI_ENABLED is not 'true'", async () => {
    vi.stubEnv("LIBRARIAN_AI_ENABLED", "");
    const task = makeTask();
    const refined = await refineArtifactDraft(task, { useAi: true });

    expect(refined.refinementSource).toBe("deterministic");
    expect(refined).toMatchObject(deterministicArtifactDraft(task));
  });
});
