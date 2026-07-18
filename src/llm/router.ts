/**
 * LLM Router — lane + complexity → Azure deployment selection
 *
 * All-Azure setup using startup credits:
 *   | Lane     | low         | medium      | high        |
 *   |----------|-------------|-------------|-------------|
 *   | research | gpt-4o-mini | gpt-4o-mini | gpt-4o      |
 *   | builder  | gpt-4o-mini | gpt-5-mini  | gpt-5-mini  |
 *   | chief    | gpt-4o-mini | gpt-4o-mini | gpt-5-mini  |
 *
 * Tiers:
 *   - gpt-4o-mini: budget (cheap, routine tasks)
 *   - gpt-4o: long-context (128K window)
 *   - gpt-5-mini: quality (important reasoning)
 */

import { callAzure, type AzureDeployment } from "./azureClient";
import {
  type Lane,
  type Complexity,
  type ModelName,
  type LLMResponse,
  getMaxTokens,
} from "./types";

export function pickModel(input: { lane: Lane; complexity: Complexity }): ModelName {
  const deployment = pickDeployment(input);
  if (deployment === "gpt-4o-mini") return "deepseek";
  if (deployment === "gpt-4o") return "kimi";
  return "gpt5mini";
}

function pickDeployment(input: { lane: Lane; complexity: Complexity }): AzureDeployment {
  const { lane, complexity } = input;

  if (lane === "research") {
    if (complexity === "high") return "gpt-4o";
    return "gpt-4o-mini";
  }

  if (lane === "builder") {
    if (complexity === "low") return "gpt-4o-mini";
    return "gpt-5-mini";
  }

  // chief lane
  if (complexity === "high") return "gpt-5-mini";
  return "gpt-4o-mini";
}

export async function runTask(input: {
  lane: Lane;
  complexity: Complexity;
  prompt: string;
}): Promise<LLMResponse> {
  const deployment = pickDeployment(input);
  const maxTokens = getMaxTokens(input.complexity);

  return callAzure(deployment, input.prompt, maxTokens);
}

export function describeRouting(): string {
  return `
Lane/Complexity → Azure Deployment:

  Lane     | low         | medium      | high
  ---------|-------------|-------------|-------------
  research | gpt-4o-mini | gpt-4o-mini | gpt-4o
  builder  | gpt-4o-mini | gpt-5-mini  | gpt-5-mini
  chief    | gpt-4o-mini | gpt-4o-mini | gpt-5-mini

Tiers:
  - gpt-4o-mini: budget (routine tasks)
  - gpt-4o: long-context (128K)
  - gpt-5-mini: quality (reasoning)

Token limits:  low=400, medium=600, high=800
Timeout:       30s
`.trim();
}
