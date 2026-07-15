/**
 * Structured, secret-free logging for Chief's AI routing decisions. Never logs
 * API keys, full prompts, or full model output — only which path was tried,
 * whether it worked, and how long it took, so routing behavior is observable
 * without leaking anything sensitive into logs.
 */
export function logChiefAiRouteDecision(entry: {
  route: string;
  ok: boolean;
  latencyMs: number;
  note?: string;
}): void {
  console.log(
    JSON.stringify({
      scope: "chief_ai_route",
      timestamp: new Date().toISOString(),
      ...entry,
    }),
  );
}
