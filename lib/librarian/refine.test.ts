import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./refine.ai", () => ({
  tryRefineWithAi: vi.fn(),
}));

import { tryRefineWithAi } from "./refine.ai";
import { refineArtifactDraft } from "./refine";
import { makeTask } from "./test-support";

describe("refineArtifactDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a deterministic draft when useAi is false", async () => {
    vi.stubEnv("LIBRARIAN_AI_ENABLED", "true");

    const result = await refineArtifactDraft(makeTask(), { useAi: false });

    expect(result.refinementSource).toBe("deterministic");
    expect(tryRefineWithAi).not.toHaveBeenCalled();
  });

  it("returns a deterministic draft when the AI feature flag is not enabled", async () => {
    vi.stubEnv("LIBRARIAN_AI_ENABLED", "");

    const result = await refineArtifactDraft(makeTask(), { useAi: true });

    expect(result.refinementSource).toBe("deterministic");
    expect(tryRefineWithAi).not.toHaveBeenCalled();
  });

  it("delegates to tryRefineWithAi when useAi and the flag are both on", async () => {
    vi.stubEnv("LIBRARIAN_AI_ENABLED", "true");
    const task = makeTask();
    vi.mocked(tryRefineWithAi).mockResolvedValue({
      title: "AI title",
      summary: "AI summary",
      tags: ["ai"],
      pathSegment: "AI title",
      noteType: "incident",
      refinementSource: "ai",
    });

    const result = await refineArtifactDraft(task, { useAi: true });

    expect(tryRefineWithAi).toHaveBeenCalledTimes(1);
    expect(result.refinementSource).toBe("ai");
    expect(result.title).toBe("AI title");
  });
});
