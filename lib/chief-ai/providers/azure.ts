import type { AzureModelConfig } from "../config.js";
import { CHIEF_AI_SYSTEM_PROMPT, buildChiefAiPrompt, toChiefAiText } from "../prompt.js";
import type { ChiefAiRequest } from "../types.js";

const API_VERSION = "2024-10-21";

interface AzureChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Generic Azure AI Foundry / Azure OpenAI-compatible chat completions call — shared by every Azure-hosted model this router tries. */
export async function callAzureChat(
  config: AzureModelConfig,
  request: ChiefAiRequest,
): Promise<{ summary: string }> {
  const url = `${config.endpoint.replace(/\/$/, "")}/openai/deployments/${config.deployment}/chat/completions?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: CHIEF_AI_SYSTEM_PROMPT },
        { role: "user", content: buildChiefAiPrompt(request) },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Azure chat completions returned ${response.status}`);
  }

  const body = (await response.json()) as AzureChatCompletionResponse;
  const content = body.choices?.[0]?.message?.content ?? "";
  return { summary: toChiefAiText(content) };
}
