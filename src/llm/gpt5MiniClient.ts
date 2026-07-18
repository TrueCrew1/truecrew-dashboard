/**
 * Azure OpenAI GPT-5 mini client — quality tier for important reasoning
 */

import { DEFAULT_CONFIG, type LLMResponse } from "./types";

const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";
const API_VERSION = "2024-08-01-preview";

interface AzureChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function callGpt5Mini(
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("AZURE_OPENAI_API_KEY not configured");
  }
  if (!ENDPOINT) {
    throw new Error("AZURE_OPENAI_ENDPOINT not configured");
  }

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
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as AzureChatResponse;
    const text = data.choices[0]?.message?.content ?? "";

    return { model: "gpt5mini", text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Azure OpenAI request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
