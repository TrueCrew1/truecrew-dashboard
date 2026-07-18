import { describe, expect, it } from "vitest";
import {
  BUILD_TEST_SUGGESTION_COMPLEXITY,
  BUILD_TEST_SUGGESTION_LANE,
  buildSuggestTestsPrompt,
  parseSuggestTestsResponse,
  toSuggestionResult,
} from "../src/llm/buildTestSuggestion";

describe("buildTestSuggestion", () => {
  it("uses builder medium routing defaults", () => {
    expect(BUILD_TEST_SUGGESTION_LANE).toBe("builder");
    expect(BUILD_TEST_SUGGESTION_COMPLEXITY).toBe("medium");
  });

  it("builds an advisory-only prompt with proposal context", () => {
    const prompt = buildSuggestTestsPrompt({
      title: "Docs-only QA change",
      summary: "Touch README for approval loop test",
      recommendedAction: "Approve if checklist is green",
      riskNote: "Low — docs only",
      checklistLabels: ["Lint passed", "Diff reviewed"],
    });

    expect(prompt).toContain("advisory only");
    expect(prompt).toContain("Human approval is required");
    expect(prompt).toContain("no automatic changes");
    expect(prompt).toContain("Docs-only QA change");
    expect(prompt).toContain("Touch README for approval loop test");
    expect(prompt).toContain("- Lint passed");
    expect(prompt).toContain("- Diff reviewed");
  });

  it("parses bullet suggestions from model text", () => {
    const suggestions = parseSuggestTestsResponse(`
- Run lint on changed files
* Confirm docs-only diff
1. Smoke test Approvals board
plain leftover line
`);

    expect(suggestions).toEqual([
      "Run lint on changed files",
      "Confirm docs-only diff",
      "Smoke test Approvals board",
      "plain leftover line",
    ]);
  });

  it("marks results as advisory only", () => {
    const result = toSuggestionResult("- Add a unit test for the mapper");
    expect(result.advisoryOnly).toBe(true);
    expect(result.lane).toBe("builder");
    expect(result.complexity).toBe("medium");
    expect(result.suggestions).toEqual(["Add a unit test for the mapper"]);
  });
});
