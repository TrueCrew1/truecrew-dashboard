/**
 * Azure AI Foundry client
 *
 * Uses the Azure AI Foundry v1 API for models like Kimi.
 */

import { DEFAULT_CONFIG, type LLMResponse, type ModelName } from "./types.js";

const API_KEY = process.env.AZURE_OPENAI_API_KEY;
// Azure AI Foundry resource endpoint (without /api/projects/... path)
const RESOURCE_ENDPOINT = process.env.AZURE_AI_RESOURCE_ENDPOINT;

interface FoundryChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export type FoundryModel = "Kimi-K2.6" | "DeepSeek-V3.2";

const MODEL_TO_NAME: Record<FoundryModel, ModelName> = {
  "Kimi-K2.6": "kimi",
  "DeepSeek-V3.2": "deepseek",
};

export async function callFoundry(
  model: FoundryModel,
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY not configured");
  }
  if (!RESOURCE_ENDPOINT) {
    throw new Error("AZURE_AI_RESOURCE_ENDPOINT not configured");
  }

  // Try v1 API which supports cross-provider models
  const url = `${RESOURCE_ENDPOINT}/openai/v1/chat/completions`;

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
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: DEFAULT_CONFIG.defaultTemperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foundry (${model}) error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as FoundryChatResponse;
    const text = data.choices[0]?.message?.content ?? "";

    return { model: MODEL_TO_NAME[model], text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Foundry (${model}) timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
