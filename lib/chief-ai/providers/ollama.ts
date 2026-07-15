import { CHIEF_AI_SYSTEM_PROMPT, buildChiefAiPrompt, toChiefAiText } from "../prompt.js";
import type { ChiefAiRequest } from "../types.js";

interface OllamaGenerateResponse {
  response?: string;
}

export async function callOllamaChat(
  host: string,
  model: string,
  request: ChiefAiRequest,
): Promise<{ summary: string }> {
  const response = await fetch(`${host.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${CHIEF_AI_SYSTEM_PROMPT}\n\n${buildChiefAiPrompt(request)}`,
      stream: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const body = (await response.json()) as OllamaGenerateResponse;
  return { summary: toChiefAiText(body.response ?? "") };
}
