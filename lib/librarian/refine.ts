import type { Task } from "../../src/types";
import type { ArtifactDraft } from "./types";
import { deterministicArtifactDraft } from "./refine.deterministic";
import { tryRefineWithAi } from "./refine.ai";

export async function refineArtifactDraft(
  task: Task,
  opts: { useAi: boolean },
): Promise<ArtifactDraft & { refinementSource: "deterministic" | "ai" }> {
  const draft = deterministicArtifactDraft(task);

  if (!opts.useAi || process.env.LIBRARIAN_AI_ENABLED !== "true") {
    return { ...draft, refinementSource: "deterministic" };
  }

  return tryRefineWithAi(task, draft);
}
