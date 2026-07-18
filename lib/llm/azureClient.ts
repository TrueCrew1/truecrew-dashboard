/**
 * Azure OpenAI client — unified client for all Azure deployments
 *
 * Supports three tiers via different deployments:
 * - gpt-4o-mini: budget tier (routine tasks)
 * - gpt-4o: long-context tier (128K context)
 * - gpt-5-mini: quality tier (important reasoning)
 */

import { DEFAULT_CONFIG, type LLMResponse, type ModelName } from "./types";

const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const API_VERSION = "2024-08-01-preview";

interface AzureChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export type AzureDeployment = "gpt-4o-mini" | "gpt-4o" | "gpt-5-mini";

const DEPLOYMENT_TO_MODEL: Record<AzureDeployment, ModelName> = {
  "gpt-4o-mini": "deepseek",
  "gpt-4o": "kimi",
  "gpt-5-mini": "gpt5mini",
};

export async function callAzure(
  deployment: AzureDeployment,
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY not configured");
  }
  if (!ENDPOINT) {
    throw new Error("AZURE_OPENAI_ENDPOINT not configured");
  }

  const url = `${ENDPOINT}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI (${deployment}) error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as AzureChatResponse;
    const text = data.choices[0]?.message?.content ?? "";

    return { model: DEPLOYMENT_TO_MODEL[deployment], text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Azure OpenAI (${deployment}) timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
