/**
 * LLM Router — lane + complexity → model selection
 *
 * Azure setup using startup credits:
 *   | Lane     | low        | medium     | high       |
 *   |----------|------------|------------|------------|
 *   | research | gpt-5-mini | gpt-5-mini | Kimi-K2.6  |
 *   | builder  | gpt-5-mini | gpt-5-mini | gpt-5-mini |
 *   | chief    | gpt-5-mini | gpt-5-mini | Kimi-K2.6  |
 *
 * Tiers:
 *   - gpt-5-mini: default (Azure OpenAI)
 *   - Kimi-K2.6: long-context (Azure AI Foundry)
 */

import { callAzure } from "./azureClient";
import { callFoundry, type FoundryModel } from "./mistralClient";
import {
  type Lane,
  type Complexity,
  type ModelName,
  type LLMResponse,
  getMaxTokens,
} from "./types";

type RouterModel = FoundryModel | "gpt-5-mini";

export function pickModel(input: { lane: Lane; complexity: Complexity }): ModelName {
  const model = pickRouterModel(input);
  if (model === "Kimi-K2.6") return "kimi";
  return "gpt5mini";
}

function pickRouterModel(input: { lane: Lane; complexity: Complexity }): RouterModel {
  const { lane, complexity } = input;

  // Use Kimi-K2.6 for high-complexity research and chief (long context)
  if (complexity === "high" && (lane === "research" || lane === "chief")) {
    return "Kimi-K2.6";
  }

  // Default to gpt-5-mini for everything else
  return "gpt-5-mini";
}

export async function runTask(input: {
  lane: Lane;
  complexity: Complexity;
  prompt: string;
}): Promise<LLMResponse> {
  const model = pickRouterModel(input);
  const maxTokens = getMaxTokens(input.complexity);

  if (model === "gpt-5-mini") {
    return callAzure("gpt-5-mini", input.prompt, maxTokens);
  }

  return callFoundry(model, input.prompt, maxTokens);
}

export function describeRouting(): string {
  return `
Lane/Complexity → Model:

  Lane     | low        | medium     | high
  ---------|------------|------------|----------
  research | gpt-5-mini | gpt-5-mini | Kimi-K2.6
  builder  | gpt-5-mini | gpt-5-mini | gpt-5-mini
  chief    | gpt-5-mini | gpt-5-mini | Kimi-K2.6

Tiers:
  - gpt-5-mini: default (Azure OpenAI)
  - Kimi-K2.6: long-context (Azure AI Foundry)

Token limits:  low=400, medium=600, high=800
Timeout:       30s
`.trim();
}
