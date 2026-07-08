import type { Task } from "../../src/types";
import type { ArtifactDraft } from "./types";
import { deterministicArtifactDraft } from "./refine.deterministic";

interface OllamaGenerateResponse {
  response?: string;
}

function parseJsonFromText(text: string): Partial<ArtifactDraft> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<ArtifactDraft>;
  } catch {
    return null;
  }
}

export async function refineWithAi(
  task: Task,
  draft: ArtifactDraft,
): Promise<ArtifactDraft & { refinementSource: "ai" }> {
  const host = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.2";

  const prompt = `You refine Obsidian artifact metadata for a work task. Reply with JSON only:
{"title":"...","summary":"...","tags":["..."],"pathSegment":"..."}

Task title: ${task.title}
Workflow type: ${task.workflowType}
Stage: ${task.stage}
Description: ${task.description}
Blocker: ${task.blocker ?? "none"}

Draft title: ${draft.title}
Draft summary: ${draft.summary}`;

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const body = (await response.json()) as OllamaGenerateResponse;
  const parsed = parseJsonFromText(body.response ?? "");
  if (!parsed?.title || !parsed.summary) {
    throw new Error("Ollama response missing title or summary");
  }

  return {
    title: String(parsed.title).slice(0, 200),
    summary: String(parsed.summary).slice(0, 500),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map(String).slice(0, 8)
      : draft.tags,
    pathSegment: String(parsed.pathSegment ?? parsed.title ?? draft.pathSegment).slice(
      0,
      120,
    ),
    noteType: draft.noteType,
    refinementSource: "ai",
  };
}

export async function tryRefineWithAi(
  task: Task,
  draft: ArtifactDraft,
): Promise<ArtifactDraft & { refinementSource: "ai" | "deterministic" }> {
  try {
    return await refineWithAi(task, draft);
  } catch {
    return { ...deterministicArtifactDraft(task), refinementSource: "deterministic" };
  }
}
