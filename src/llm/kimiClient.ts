/**
 * Moonshot Kimi 2.6 client — long-context synthesis
 *
 * Premium tier: use only when long context is truly required (high-complexity Research).
 * Uses Moonshot API (OpenAI-compatible).
 */

import { DEFAULT_CONFIG, type LLMCallOptions, type LLMResponse } from "./types";

const API_KEY = process.env.KIMI_API_KEY;
const BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const MODEL = "moonshot-v1-128k";

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KimiResponse {
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

export async function callKimi(opts: LLMCallOptions): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("KIMI_API_KEY not configured");
  }

  const maxTokens = opts.maxTokens ?? DEFAULT_CONFIG.defaultMaxTokens;
  const temperature = opts.temperature ?? DEFAULT_CONFIG.defaultTemperature;

  const messages: KimiMessage[] = [
    { role: "user", content: opts.prompt },
  ];

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
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kimi API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as KimiResponse;

    const text = data.choices[0]?.message?.content ?? "";
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    console.log(
      `[LLM] kimi | tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return {
      text,
      model: "kimi",
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Kimi request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
