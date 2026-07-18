/**
 * LLM Router — lane + complexity → model selection
 *
 * Azure setup using startup credits:
 *   | Lane     | low          | medium       | high         |
 *   |----------|--------------|--------------|--------------|
 *   | research | DeepSeek-V3.2| DeepSeek-V3.2| Kimi-K2.6    |
 *   | builder  | DeepSeek-V3.2| gpt-5-mini   | gpt-5-mini   |
 *   | chief    | DeepSeek-V3.2| DeepSeek-V3.2| gpt-5-mini   |
 *
 * Tiers:
 *   - DeepSeek-V3.2: budget (routine tasks) via Azure AI Foundry
 *   - gpt-5-mini: quality (reasoning) via Azure AI Foundry
 *   - Kimi-K2.6: long-context via Azure AI Foundry
 */

import { callFoundry, type FoundryModel } from "./mistralClient.js";
import {
  type Lane,
  type Complexity,
  type ModelName,
  type LLMResponse,
  getMaxTokens,
} from "./types.js";

type RouterModel = FoundryModel;

export function pickModel(input: { lane: Lane; complexity: Complexity }): ModelName {
  const model = pickRouterModel(input);
  if (model === "DeepSeek-V3.2") return "deepseek";
  if (model === "Kimi-K2.6") return "kimi";
  return "gpt5mini";
}

function pickRouterModel(input: { lane: Lane; complexity: Complexity }): RouterModel {
  const { lane, complexity } = input;

  if (lane === "research") {
    if (complexity === "high") return "Kimi-K2.6";
    return "DeepSeek-V3.2";
  }

  if (lane === "builder") {
    if (complexity === "low") return "DeepSeek-V3.2";
    return "gpt-5-mini";
  }

  // chief lane
  if (complexity === "high") return "gpt-5-mini";
  return "DeepSeek-V3.2";
}

export async function runTask(input: {
  lane: Lane;
  complexity: Complexity;
  prompt: string;
}): Promise<LLMResponse> {
  const model = pickRouterModel(input);
  const maxTokens = getMaxTokens(input.complexity);

  return callFoundry(model, input.prompt, maxTokens);
}

export function describeRouting(): string {
  return `
Lane/Complexity → Model:

  Lane     | low          | medium       | high
  ---------|--------------|--------------|------------
  research | DeepSeek-V3.2| DeepSeek-V3.2| Kimi-K2.6
  builder  | DeepSeek-V3.2| gpt-5-mini   | gpt-5-mini
  chief    | DeepSeek-V3.2| DeepSeek-V3.2| gpt-5-mini

Tiers:
  - DeepSeek-V3.2: budget (routine tasks)
  - gpt-5-mini: quality (reasoning)
  - Kimi-K2.6: long-context

Token limits:  low=400, medium=600, high=800
Timeout:       30s
`.trim();
}
