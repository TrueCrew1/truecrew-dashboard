import { askAzureAi, isAzureAiConfigured, type AzureAiDeployment } from "../azureAi/client.js";
import { askOllama, isOllamaReachable, type OllamaModel } from "../ollama/client.js";

export type ChiefFallbackCategory = "general" | "code" | "reasoning";
export type ChiefFallbackSource = "azure" | "ollama";

/** Which caller is routing through this — for logging/identification only, does not affect model selection. */
export type ChiefFallbackLane = "chief" | "builder" | "research";

export interface ChiefFallbackResult {
  summary: string;
  source: ChiefFallbackSource;
  model: string;
  category: ChiefFallbackCategory;
  lane: ChiefFallbackLane;
}

export interface ChiefRouteOptions {
  /** Skip Azure entirely and only try Ollama — e.g. the UI's "Prefer local only" toggle. */
  localOnly?: boolean;
  /** Caller identity for logging (defaults to "chief"). Model/category selection is unaffected. */
  lane?: ChiefFallbackLane;
}

const CODE_PATTERN = /\b(code|refactor|function|typescript|javascript|api|schema|migration|long[- ]?context|bug|pull request|pr)\b/i;
const REASONING_PATTERN = /\b(strategy|strategic|analy[sz]|reason|trade-?off|architecture|risk|decision|prioriti[sz]e|plan)\b/i;

/** Keyword classification, same style as chiefCommandRouter's regex dispatch. */
export function classifyChiefFallbackQuery(query: string): ChiefFallbackCategory {
  if (CODE_PATTERN.test(query)) return "code";
  if (REASONING_PATTERN.test(query)) return "reasoning";
  return "general";
}

const AZURE_MODEL_BY_CATEGORY: Record<ChiefFallbackCategory, AzureAiDeployment> = {
  general: "gpt-5-mini",
  code: "kimi-k2-6",
  reasoning: "deepseek-v4-pro",
};

const OLLAMA_MODEL_BY_CATEGORY: Record<ChiefFallbackCategory, OllamaModel> = {
  general: "llama3",
  code: "llama3",
  reasoning: "deepseek-r1",
};

export function isCloudFallbackEnabled(): boolean {
  return process.env.CHIEF_AI_FALLBACK_ENABLED === "true";
}

export function isOllamaFallbackEnabled(): boolean {
  return process.env.CHIEF_OLLAMA_FALLBACK_ENABLED === "true";
}

export function isLocalOnlyModeDefault(): boolean {
  return process.env.CHIEF_LOCAL_ONLY_MODE === "true";
}

const SYSTEM_PROMPT =
  "You are Chief, an operations assistant for a field-ops/maintenance SaaS. " +
  "Answer the operator's question in 2-3 plain, practical sentences. " +
  "No marketing language. If the live context below doesn't cover the question, say so plainly.";

function buildMessages(query: string, contextSummary: string) {
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: contextSummary ? `Live context: ${contextSummary}\n\nQuestion: ${query}` : query,
    },
  ];
}

async function tryOllama(
  category: ChiefFallbackCategory,
  messages: ReturnType<typeof buildMessages>,
  lane: ChiefFallbackLane,
): Promise<ChiefFallbackResult | null> {
  if (!(await isOllamaReachable())) return null;

  const model = OLLAMA_MODEL_BY_CATEGORY[category];
  try {
    const content = await askOllama(model, messages);
    return { summary: content, source: "ollama", model, category, lane };
  } catch (error) {
    console.error(`Chief AI fallback (${lane}): Ollama (${model}) failed`, error);
    return null;
  }
}

/**
 * Only ever called after resolveChiefCommand's deterministic router finds no
 * specialist match (isGenericFallback: true) — a real deterministic match
 * always wins upstream and never reaches this function.
 *
 * Order: local-only mode -> Ollama only. Otherwise: Azure (model chosen by
 * category) -> Ollama on Azure failure -> null (caller keeps the canned
 * generic response). Every tier is flag-gated off by default.
 *
 * `options.lane` identifies the caller (Chief/Builder/Research) for logging
 * only — it never changes which model gets picked, that's still driven
 * entirely by `classifyChiefFallbackQuery`.
 */
export async function routeChiefFallback(
  query: string,
  contextSummary: string,
  options: ChiefRouteOptions = {},
): Promise<ChiefFallbackResult | null> {
  const localOnly = options.localOnly ?? isLocalOnlyModeDefault();
  const lane = options.lane ?? "chief";
  const category = classifyChiefFallbackQuery(query);
  const messages = buildMessages(query, contextSummary);

  if (localOnly) {
    if (!isOllamaFallbackEnabled()) return null;
    return tryOllama(category, messages, lane);
  }

  if (isCloudFallbackEnabled()) {
    const azureModel = AZURE_MODEL_BY_CATEGORY[category];
    if (isAzureAiConfigured(azureModel)) {
      try {
        const content = await askAzureAi(azureModel, messages);
        return { summary: content, source: "azure", model: azureModel, category, lane };
      } catch (error) {
        console.error(`Chief AI fallback (${lane}): Azure (${azureModel}) failed, trying Ollama`, error);
      }
    }
  }

  if (isOllamaFallbackEnabled()) {
    return tryOllama(category, messages, lane);
  }

  return null;
}
