import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtifactDraft } from "./types";
import { refineWithAi, tryRefineWithAi } from "./refine.ai";
import { makeTask } from "./test-support";

const draft: ArtifactDraft = {
  title: "Draft title",
  summary: "Draft summary",
  tags: ["repair", "librarian"],
  pathSegment: "Draft title",
  noteType: "incident",
};

function mockOllama(response: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ response: JSON.stringify(response) }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("refineWithAi", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("parses the model JSON and marks the result as ai-refined", async () => {
    mockOllama({
      title: "Refined title",
      summary: "Refined summary",
      tags: ["a", "b"],
      pathSegment: "refined-path",
    });

    const result = await refineWithAi(makeTask(), draft);

    expect(result.refinementSource).toBe("ai");
    expect(result.title).toBe("Refined title");
    expect(result.summary).toBe("Refined summary");
    expect(result.tags).toEqual(["a", "b"]);
    expect(result.pathSegment).toBe("refined-path");
    // noteType is preserved from the deterministic draft, never from the model.
    expect(result.noteType).toBe("incident");
  });

  it("keeps the draft tags when the model omits a tags array", async () => {
    mockOllama({ title: "T", summary: "S" });

    const result = await refineWithAi(makeTask(), draft);

    expect(result.tags).toEqual(draft.tags);
  });

  it("throws when the HTTP response is not ok", async () => {
    mockOllama({ title: "T", summary: "S" }, false, 500);

    await expect(refineWithAi(makeTask(), draft)).rejects.toThrow("Ollama returned 500");
  });

  it("throws when the model response is missing title or summary", async () => {
    mockOllama({ summary: "only summary" });

    await expect(refineWithAi(makeTask(), draft)).rejects.toThrow(
      "Ollama response missing title or summary",
    );
  });
});

describe("tryRefineWithAi (fail-open)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("returns the ai draft on success", async () => {
    mockOllama({ title: "Refined", summary: "Summary", tags: ["x"], pathSegment: "p" });

    const result = await tryRefineWithAi(makeTask(), draft);

    expect(result.refinementSource).toBe("ai");
  });

  it("falls back to a deterministic draft when the AI call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection refused")),
    );

    const result = await tryRefineWithAi(makeTask(), draft);

    expect(result.refinementSource).toBe("deterministic");
  });
});
