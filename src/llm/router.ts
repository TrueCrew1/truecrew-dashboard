/**
 * LLM Router — lane + complexity → model selection
 *
 * This is the ONLY place that decides DeepSeek vs Kimi vs GPT-5 mini.
 * Cost discipline:
 *   - DeepSeek: default for cheap, routine tasks
 *   - GPT-5 mini: important reasoning, Builder medium+, Chief high-complexity
 *   - Kimi 2.6: only when long context is truly required (high-complexity Research)
 */

import { callDeepseek } from "./deepseekClient";
import { callKimi } from "./kimiClient";
import { callGpt5Mini } from "./gpt5MiniClient";
import { type Lane, type Complexity, type ModelName, type TaskInput, type LLMResponse } from "./types";

export { type Lane, type Complexity, type TaskInput };

function pickModel({ lane, complexity }: Pick<TaskInput, "lane" | "complexity">): ModelName {
  if (lane === "research") {
    if (complexity === "high") return "kimi";
    return "deepseek";
  }

  if (lane === "builder") {
    if (complexity === "low") return "deepseek";
    return "gpt5mini";
  }

  if (complexity === "high") return "gpt5mini";
  return "deepseek";
}

function getMaxTokens(complexity: Complexity): number {
  switch (complexity) {
    case "high":
      return 800;
    case "medium":
      return 600;
    case "low":
    default:
      return 400;
  }
}

export async function runTask(input: TaskInput): Promise<string> {
  const model = pickModel(input);
  const maxTokens = getMaxTokens(input.complexity);

  console.log(`[LLM] routing: lane=${input.lane}, complexity=${input.complexity} → model=${model}`);

  let response: LLMResponse;

  switch (model) {
    case "deepseek":
      response = await callDeepseek({ prompt: input.prompt, maxTokens });
      break;
    case "kimi":
      response = await callKimi({ prompt: input.prompt, maxTokens });
      break;
    case "gpt5mini":
      response = await callGpt5Mini({ prompt: input.prompt, maxTokens });
      break;
  }

  return response.text;
}

export function describeRouting(): string {
  return `
LLM Router decision matrix:

  Lane      | Low       | Medium    | High
  ----------|-----------|-----------|----------
  research  | deepseek  | deepseek  | kimi
  builder   | deepseek  | gpt5mini  | gpt5mini
  chief     | deepseek  | deepseek  | gpt5mini

Max tokens by complexity:
  - low: 400
  - medium: 600
  - high: 800

Default temperature: 0.4
Timeout: 30s
`.trim();
}
