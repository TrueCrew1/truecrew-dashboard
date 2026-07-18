/**
 * LLM Router module — external API routing for Chief/Research/Builder lanes
 */

export { runTask, describeRouting, type Lane, type Complexity, type TaskInput } from "./router";
export { callDeepseek } from "./deepseekClient";
export { callKimi } from "./kimiClient";
export { callGpt5Mini } from "./gpt5MiniClient";
export { type LLMResponse, type LLMCallOptions, type ModelName, DEFAULT_CONFIG } from "./types";
