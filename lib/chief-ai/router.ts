import {
  getAzureModelConfig,
  getOllamaChiefModel,
  getOllamaHost,
  isChiefAiFallbackEnabled,
  isChiefAiLocalOnly,
} from "./config.js";
import { logChiefAiRouteDecision } from "./log.js";
import { CHIEF_AI_RECOMMENDED_ACTION } from "./prompt.js";
import { callAzureChat } from "./providers/azure.js";
import { callOllamaChat } from "./providers/ollama.js";
import type { ChiefAiRequest, ChiefAiResult, ChiefAiRoute } from "./types.js";

type ProviderAttempt = (request: ChiefAiRequest) => Promise<ChiefAiResult | null>;

/** Runs one provider call, logs the outcome, and normalizes any failure to `null` (try the next one). */
async function runProvider(
  route: ChiefAiRoute,
  call: () => Promise<{ summary: string }>,
): Promise<ChiefAiResult | null> {
  const started = Date.now();
  try {
    const { summary } = await call();
    logChiefAiRouteDecision({ route, ok: true, latencyMs: Date.now() - started });
    return { summary, recommendedAction: CHIEF_AI_RECOMMENDED_ACTION, route, degraded: false };
  } catch (error) {
    logChiefAiRouteDecision({
      route,
      ok: false,
      latencyMs: Date.now() - started,
      note: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  }
}

export async function tryAzureGpt5Mini(request: ChiefAiRequest): Promise<ChiefAiResult | null> {
  const config = getAzureModelConfig("AZURE_GPT5_MINI_DEPLOYMENT");
  if (!config) return null;
  return runProvider("azure_gpt5_mini", () => callAzureChat(config, request));
}

export async function tryAzureDeepseekV4Pro(request: ChiefAiRequest): Promise<ChiefAiResult | null> {
  const config = getAzureModelConfig("AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT");
  if (!config) return null;
  return runProvider("azure_deepseek_v4_pro", () => callAzureChat(config, request));
}

export async function tryAzureKimiK26(request: ChiefAiRequest): Promise<ChiefAiResult | null> {
  const config = getAzureModelConfig("AZURE_KIMI_K26_DEPLOYMENT");
  if (!config) return null;
  return runProvider("azure_kimi_k26", () => callAzureChat(config, request));
}

export async function tryOllamaLlama3(request: ChiefAiRequest): Promise<ChiefAiResult | null> {
  const model = getOllamaChiefModel("OLLAMA_CHIEF_MODEL_PRIMARY", "llama3");
  return runProvider("ollama_llama3", () => callOllamaChat(getOllamaHost(), model, request));
}

export async function tryOllamaDeepseekR1(request: ChiefAiRequest): Promise<ChiefAiResult | null> {
  const model = getOllamaChiefModel("OLLAMA_CHIEF_MODEL_SECONDARY", "deepseek-r1");
  return runProvider("ollama_deepseek_r1", () => callOllamaChat(getOllamaHost(), model, request));
}

function deterministicOnlyResult(request: ChiefAiRequest): ChiefAiResult {
  return {
    summary: request.deterministicSummary ?? "AI fallback is disabled — deterministic routing only.",
    recommendedAction: "Enable CHIEF_AI_FALLBACK_ENABLED to allow AI-assisted responses.",
    route: "deterministic",
    degraded: false,
  };
}

function cannedFallbackResult(request: ChiefAiRequest): ChiefAiResult {
  return {
    summary:
      request.deterministicSummary ??
      "No AI provider is currently reachable. Deterministic routing already ran for this query.",
    recommendedAction:
      "Review the deterministic summary above, or try again once an AI provider is configured.",
    route: "canned_fallback",
    degraded: true,
  };
}

/**
 * Deterministic-first AI fallback chain for Chief. Order, per
 * docs/AGENT_RUNBOOK.md § Chief AI Fallback:
 * Azure GPT-5 mini -> Azure DeepSeek V4 Pro -> Azure Kimi K2.6 -> Ollama llama3
 * -> Ollama deepseek-r1 -> canned fallback. CHIEF_AI_LOCAL_ONLY_MODE skips the
 * whole Azure tier. A provider with incomplete config is skipped, not an error;
 * this function always resolves (never throws) so a caller never has to
 * distinguish "AI failed" from "AI declined" — degraded=true covers both.
 */
export async function routeChiefAiRequest(request: ChiefAiRequest): Promise<ChiefAiResult> {
  if (!isChiefAiFallbackEnabled()) {
    logChiefAiRouteDecision({ route: "deterministic", ok: true, latencyMs: 0, note: "AI fallback disabled" });
    return deterministicOnlyResult(request);
  }

  const chain: ProviderAttempt[] = isChiefAiLocalOnly()
    ? [tryOllamaLlama3, tryOllamaDeepseekR1]
    : [tryAzureGpt5Mini, tryAzureDeepseekV4Pro, tryAzureKimiK26, tryOllamaLlama3, tryOllamaDeepseekR1];

  for (const tryProvider of chain) {
    const result = await tryProvider(request);
    if (result) return result;
  }

  logChiefAiRouteDecision({
    route: "canned_fallback",
    ok: true,
    latencyMs: 0,
    note: "all providers unconfigured or failed",
  });
  return cannedFallbackResult(request);
}
