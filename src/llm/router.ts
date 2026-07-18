/**
 * LLM Router — lane + complexity → model selection
 *
 * Decision matrix:
 *   | Lane     | low      | medium   | high     |
 *   |----------|----------|----------|----------|
 *   | research | deepseek | deepseek | kimi     |
 *   | builder  | deepseek | gpt5mini | gpt5mini |
 *   | chief    | deepseek | deepseek | gpt5mini |
 */

import { callDeepseek } from "./deepseekClient";
import { callKimi } from "./kimiClient";
import { callGpt5Mini } from "./gpt5MiniClient";
import {
  type Lane,
  type Complexity,
  type ModelName,
  type LLMResponse,
  getMaxTokens,
} from "./types";

export function pickModel(input: { lane: Lane; complexity: Complexity }): ModelName {
  const { lane, complexity } = input;

  if (lane === "research") {
    if (complexity === "high") return "kimi";
    return "deepseek";
  }

  if (lane === "builder") {
    if (complexity === "low") return "deepseek";
    return "gpt5mini";
  }

  // chief lane
  if (complexity === "high") return "gpt5mini";
  return "deepseek";
}

export async function runTask(input: {
  lane: Lane;
  complexity: Complexity;
  prompt: string;
}): Promise<LLMResponse> {
  const model = pickModel(input);
  const maxTokens = getMaxTokens(input.complexity);

  switch (model) {
    case "deepseek":
      return callDeepseek(input.prompt, maxTokens);
    case "kimi":
      return callKimi(input.prompt, maxTokens);
    case "gpt5mini":
      return callGpt5Mini(input.prompt, maxTokens);
  }
}

export function describeRouting(): string {
  return `
Lane/Complexity → Model:

  Lane     | low      | medium   | high
  ---------|----------|----------|----------
  research | deepseek | deepseek | kimi
  builder  | deepseek | gpt5mini | gpt5mini
  chief    | deepseek | deepseek | gpt5mini

Token limits:  low=400, medium=600, high=800
Temperature:   0.4
Timeout:       30s
`.trim();
}
