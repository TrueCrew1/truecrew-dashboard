/**
 * Azure AI Foundry client
 *
 * Uses the Azure AI Foundry v1 API for all router models (DeepSeek, Kimi, gpt-5-mini).
 */

import { DEFAULT_CONFIG, type LLMResponse, type ModelName } from "./types.js";
import { resolveFoundryEndpoint } from "./foundryConfig.js";

const API_KEY = process.env.AZURE_OPENAI_API_KEY;

interface FoundryChatResponse {
  choices: Array<{
    message: {
      content: string;
      reasoning_content?: string;
    };
  }>;
}

export type FoundryModel = "Kimi-K2.6" | "DeepSeek-V3.2" | "gpt-5-mini";

const MODEL_TO_NAME: Record<FoundryModel, ModelName> = {
  "Kimi-K2.6": "kimi",
  "DeepSeek-V3.2": "deepseek",
  "gpt-5-mini": "gpt5mini",
};

export async function callFoundry(
  model: FoundryModel,
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY not configured");
  }
  const resourceEndpoint = resolveFoundryEndpoint();
  if (!resourceEndpoint) {
    throw new Error(
      "AZURE_AI_RESOURCE_ENDPOINT not configured (or derivable from AZURE_OPENAI_ENDPOINT)"
    );
  }

  // Try v1 API which supports cross-provider models
  const url = `${resourceEndpoint}/openai/v1/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: maxTokens,
    };
    // gpt-5-mini on Foundry rejects custom temperature (defaults only).
    if (model !== "gpt-5-mini") {
      body.temperature = DEFAULT_CONFIG.defaultTemperature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foundry (${model}) error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as FoundryChatResponse;
    const message = data.choices[0]?.message;
    const text = message?.content?.trim() || message?.reasoning_content?.trim() || "";

    return { model: MODEL_TO_NAME[model], text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Foundry (${model}) timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
