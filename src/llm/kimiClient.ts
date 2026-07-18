/**
 * Moonshot Kimi 2.6 client — long-context tier
 */

import { DEFAULT_CONFIG, type LLMResponse } from "./types";

const API_KEY = process.env.KIMI_API_KEY;
const BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const MODEL = "moonshot-v1-128k";

interface KimiChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function callKimi(
  prompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("KIMI_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
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
      throw new Error(`Kimi API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as KimiChatResponse;
    const text = data.choices[0]?.message?.content ?? "";

    return { model: "kimi", text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Kimi request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
