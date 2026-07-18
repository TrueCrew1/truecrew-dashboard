/**
 * LLM Router types — shared across clients and router
 */

export type Lane = "research" | "builder" | "chief";
export type Complexity = "low" | "medium" | "high";
export type ModelName = "deepseek" | "kimi" | "gpt5mini";

export interface LLMCallOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  model: ModelName;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TaskInput {
  lane: Lane;
  complexity: Complexity;
  prompt: string;
}

export interface LLMConfig {
  defaultMaxTokens: number;
  defaultTemperature: number;
  timeoutMs: number;
}

export const DEFAULT_CONFIG: LLMConfig = {
  defaultMaxTokens: 400,
  defaultTemperature: 0.4,
  timeoutMs: 30_000,
};
