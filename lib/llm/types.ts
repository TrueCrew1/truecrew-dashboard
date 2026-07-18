/**
 * LLM Router types — shared across clients and router
 */

export type Lane = "research" | "builder" | "chief";
export type Complexity = "low" | "medium" | "high";
export type ModelName = "deepseek" | "kimi" | "gpt5mini";

export interface LLMResponse {
  model: ModelName;
  text: string;
}

export interface LLMConfig {
  maxTokens: {
    low: number;
    medium: number;
    high: number;
  };
  defaultTemperature: number;
  timeoutMs: number;
}

export const DEFAULT_CONFIG: LLMConfig = {
  maxTokens: {
    low: 400,
    medium: 600,
    high: 800,
  },
  defaultTemperature: 0.4,
  timeoutMs: 30_000,
};

export function getMaxTokens(complexity: Complexity): number {
  return DEFAULT_CONFIG.maxTokens[complexity];
}
