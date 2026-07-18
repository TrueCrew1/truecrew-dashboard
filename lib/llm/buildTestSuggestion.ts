/**
 * Builder test-suggestion helper — advisory only.
 *
 * Builds a short prompt for the LLM router (builder / medium → gpt-5-mini)
 * and parses the response into checklist-style suggestions.
 *
 * No side effects: does not approve, merge, deploy, or mutate approval state.
 */

import type { Complexity, Lane } from "./types";

export const BUILD_TEST_SUGGESTION_LANE: Lane = "builder";
export const BUILD_TEST_SUGGESTION_COMPLEXITY: Complexity = "medium";

export interface BuildTestSuggestionInput {
  title: string;
  summary: string;
  recommendedAction?: string;
  riskNote?: string;
  checklistLabels?: string[];
}

export interface BuildTestSuggestionResult {
  /** Plain model text (trimmed). */
  text: string;
  /** Parsed bullet lines for display. */
  suggestions: string[];
  lane: Lane;
  complexity: Complexity;
  advisoryOnly: true;
}

const GUARDRAIL_PREAMBLE = [
  "You are advising a human operator reviewing a Build agent approval.",
  "Your output is advisory only. Do not claim anything was approved, merged, or deployed.",
  "Human approval is required before any next step. Suggest tests only — no automatic changes.",
].join(" ");

export function buildSuggestTestsPrompt(input: BuildTestSuggestionInput): string {
  const checklist =
    input.checklistLabels && input.checklistLabels.length > 0
      ? input.checklistLabels.map((label) => `- ${label}`).join("\n")
      : "- (none listed)";

  return [
    GUARDRAIL_PREAMBLE,
    "",
    "Propose 3–5 concrete, short test or verification ideas for this change.",
    "Return ONLY a bullet list (each line starting with '- '). No preamble.",
    "",
    `Title: ${input.title}`,
    `Summary: ${input.summary}`,
    input.recommendedAction ? `Recommended action: ${input.recommendedAction}` : "",
    input.riskNote ? `Risk / impact: ${input.riskNote}` : "",
    "Existing checklist:",
    checklist,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseSuggestTestsResponse(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 8);
}

export function toSuggestionResult(text: string): BuildTestSuggestionResult {
  return {
    text: text.trim(),
    suggestions: parseSuggestTestsResponse(text),
    lane: BUILD_TEST_SUGGESTION_LANE,
    complexity: BUILD_TEST_SUGGESTION_COMPLEXITY,
    advisoryOnly: true,
  };
}
