import { afterEach, describe, expect, it, vi } from "vitest";
import { refineArtifactDraft } from "../lib/librarian/refine.js";
import { deterministicArtifactDraft } from "../lib/librarian/refine.deterministic.js";
import { makeTask } from "./fixtures.js";

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
