import type { ChiefAiRequest } from "./types.js";

export const CHIEF_AI_SYSTEM_PROMPT =
  "You are Chief, an operations assistant for a field-service/maintenance dashboard. " +
  "Answer plainly and practically for a supervisor or operator standing on a job site — " +
  "industrial tone, no marketing language. You are advisory only: never claim to execute, " +
  "approve, or change anything. The operator reviews and acts on everything you say.";

export function buildChiefAiPrompt({ query, deterministicSummary }: ChiefAiRequest): string {
  const lines = [
    deterministicSummary ? `Deterministic routing already found: ${deterministicSummary}` : null,
    `Operator asked: ${query}`,
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

/** Every provider adapter funnels its raw output through this — one place that enforces a non-empty, bounded response. */
export function toChiefAiText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty AI response");
  return trimmed.slice(0, 1000);
}

export const CHIEF_AI_RECOMMENDED_ACTION =
  "AI-assisted response — advisory only. Verify before acting; nothing executes automatically.";
