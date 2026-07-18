/**
 * Serverless-safe re-exports for the LLM router.
 * API routes should import from here (not src/llm) so Vercel bundles consistently.
 */

export { runTask } from "../../src/llm/router.js";
export {
  buildSuggestTestsPrompt,
  toSuggestionResult,
  type BuildTestSuggestionInput,
} from "../../src/llm/buildTestSuggestion.js";
