/**
 * DeepSeek V-series client — cheap, routine tasks
 *
 * Budget tier: default for Research v1, Builder v1 low-complexity, Chief summaries.
 * Uses DeepSeek Chat API (OpenAI-compatible).
 */

import { DEFAULT_CONFIG, type LLMCallOptions, type LLMResponse } from "./types";

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = "deepseek-chat";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
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

export async function callDeepseek(opts: LLMCallOptions): Promise<LLMResponse> {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const maxTokens = opts.maxTokens ?? DEFAULT_CONFIG.defaultMaxTokens;
  const temperature = opts.temperature ?? DEFAULT_CONFIG.defaultTemperature;

  const messages: DeepSeekMessage[] = [
    { role: "user", content: opts.prompt },
  ];

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
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as DeepSeekResponse;

    const text = data.choices[0]?.message?.content ?? "";
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    console.log(
      `[LLM] deepseek | tokens: ${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens}`
    );

    return {
      text,
      model: "deepseek",
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`DeepSeek request timed out after ${DEFAULT_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}
