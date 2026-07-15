export type ChiefAiRoute =
  | "deterministic"
  | "azure_gpt5_mini"
  | "azure_deepseek_v4_pro"
  | "azure_kimi_k26"
  | "ollama_llama3"
  | "ollama_deepseek_r1"
  | "canned_fallback";

export interface ChiefAiRequest {
  query: string;
  deterministicSummary?: string;
}

export interface ChiefAiResult {
  summary: string;
  recommendedAction: string;
  route: ChiefAiRoute;
  /** True when no configured/reachable AI provider actually answered this request. */
  degraded: boolean;
}

export const CHIEF_AI_ROUTE_LABELS: Record<ChiefAiRoute, string> = {
  deterministic: "Deterministic",
  azure_gpt5_mini: "Azure · GPT-5 mini",
  azure_deepseek_v4_pro: "Azure · DeepSeek V4 Pro",
  azure_kimi_k26: "Azure · Kimi K2.6",
  ollama_llama3: "Ollama · llama3",
  ollama_deepseek_r1: "Ollama · deepseek-r1",
  canned_fallback: "Canned fallback",
};

export function formatChiefAiRouteLabel(route: ChiefAiRoute): string {
  return CHIEF_AI_ROUTE_LABELS[route];
}
