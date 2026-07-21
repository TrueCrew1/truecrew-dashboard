import { emitChiefGovernanceEvent } from "@/components/chief/chiefGovernanceEvents";
import type { SearchActionKind } from "./types";

/**
 * Search-specific observability, built the same way chiefLog.ts builds
 * packet/card logging on top of chiefGovernanceEvents.ts — reuses the
 * existing (dev-only, session-scoped) Governance Events bus instead of a
 * second logging system. Best-effort: emitChiefGovernanceEvent already
 * swallows its own failures, so a broken logging call can never block a
 * search or an action.
 */
export const searchLog = {
  /** Logs a query and how many results it produced, per group. */
  queryRun(query: string, resultCounts: Record<string, number>): void {
    const total = Object.values(resultCounts).reduce((sum, n) => sum + n, 0);
    emitChiefGovernanceEvent({
      id: `evt-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "search_query",
      summary: `Search "${query}" — ${total} result${total === 1 ? "" : "s"}`,
      detail: { query, resultCounts },
      timestamp: new Date().toISOString(),
    });
  },

  /** Logs which action a selected search result routed to, and the outcome. */
  actionRouted(action: SearchActionKind, outcomeMessage: string): void {
    emitChiefGovernanceEvent({
      id: `evt-search-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "search_action_routed",
      summary: outcomeMessage,
      detail: { action },
      timestamp: new Date().toISOString(),
    });
  },

  /** Logs a search or action failure — searchService/intentParser errors, action-router throws. */
  error(query: string, error: unknown): void {
    emitChiefGovernanceEvent({
      id: `evt-search-error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "search_error",
      summary: `Search failed for "${query}"`,
      detail: { query, message: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    });
  },
};
