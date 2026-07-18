/**
 * Azure OpenAI GPT-5 mini client — higher-quality reasoning
 *
 * Quality tier: use for important decisions, Builder medium+ complexity, Chief high-complexity.
 * Uses Azure OpenAI API.
 */

import { DEFAULT_CONFIG, type LLMCallOptions, type LLMResponse } from "./types";

const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";
const API_VERSION = "2024-08-01-preview";

interface AzureMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AzureResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGpt5Mini(opts: LLMCallOptions): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY not configured");
  }
  if (!ENDPOINT) {
    throw new Error("AZURE_OPENAI_ENDPOINT not configured");
  }

  const maxTokens = opts.maxTokens ?? DEFAULT_CONFIG.defaultMaxTokens;
  const temperature = opts.temperature ?? DEFAULT_CONFIG.defaultTemperature;

  const messages: AzureMessage[] = [
    { role: "user", content: opts.prompt },
  ];

  const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

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
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as AzureResponse;

    const text = data.choices[0]?.message?.content ?? "";
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    console.log(
      `[LLM] gpt5mini | tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return {
      text,
      model: "gpt5mini",
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Azure OpenAI request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
