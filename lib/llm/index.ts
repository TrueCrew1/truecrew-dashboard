/**
 * LLM Router module — serverless-safe location under lib/llm.
 * src/llm re-exports here for CLI and tests.
 */

export { type Lane, type Complexity, type ModelName, type LLMResponse } from "./types.js";
export { pickModel, runTask, describeRouting } from "./router.js";
export { callAzure, type AzureDeployment } from "./azureClient.js";
export { callFoundry, type FoundryModel } from "./mistralClient.js";
export {
  buildSuggestTestsPrompt,
  parseSuggestTestsResponse,
  toSuggestionResult,
  BUILD_TEST_SUGGESTION_LANE,
  BUILD_TEST_SUGGESTION_COMPLEXITY,
  type BuildTestSuggestionInput,
  type BuildTestSuggestionResult,
} from "./buildTestSuggestion.js";
