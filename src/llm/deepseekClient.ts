/**
 * DeepSeek V-series client — budget tier for routine tasks
 */

import { DEFAULT_CONFIG, type LLMResponse } from "./types";

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = "deepseek-chat";

interface DeepSeekChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function callDeepseek(
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: DEFAULT_CONFIG.defaultTemperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const text = data.choices[0]?.message?.content ?? "";

    return { model: "deepseek", text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`DeepSeek request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
