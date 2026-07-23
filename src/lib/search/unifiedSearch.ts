import { parseCommand } from "./commandParser";
import { buildSuggestedActionsForResponse } from "./actionRouter";
import { logSearchEvent } from "./observability";
import {
  searchActiveWork,
  searchAgents,
  searchCustomers,
  searchDocuments,
  searchProjects,
  searchTasks,
} from "./providers";
import { rankResults } from "./ranker";
import type { SearchDataContext, SearchResponse, SearchResult, SearchResultType } from "./types";

function collectResults(ctx: SearchDataContext, query: string, types?: SearchResultType[]): SearchResult[] {
  const allowed = types ? new Set(types) : null;
  const buckets: SearchResult[] = [];

  const maybeAdd = (results: SearchResult[]) => {
    for (const result of results) {
      if (!allowed || allowed.has(result.type)) buckets.push(result);
    }
  };

  maybeAdd(searchTasks(ctx, query));
  maybeAdd(searchProjects(ctx, query));
  maybeAdd(searchAgents(ctx, query));
  maybeAdd(searchDocuments(ctx, query));
  maybeAdd(searchActiveWork(ctx, query));
  maybeAdd(searchCustomers(ctx, query));

  if (types?.includes("project")) {
    maybeAdd(searchProjects(ctx, query));
  }

  return buckets;
}

export function executeUnifiedSearch(
  query: string,
  ctx: SearchDataContext,
): SearchResponse {
  const started = performance.now();
  const intent = parseCommand(query);
  const searchQuery = intent.searchQuery || query;
  const results = collectResults(ctx, searchQuery, intent.filters?.types);
  const groups = rankResults(results);
  const suggestedActions = buildSuggestedActionsForResponse(intent, {
    query,
    intent,
    groups,
    suggestedActions: [],
    totalResults: results.length,
    tookMs: 0,
  });

  const response: SearchResponse = {
    query,
    intent,
    groups,
    suggestedActions,
    totalResults: results.length,
    tookMs: Math.round(performance.now() - started),
  };

  logSearchEvent({
    event: "search",
    query,
    intent,
    resultCount: response.totalResults,
    tookMs: response.tookMs,
  });

  logSearchEvent({
    event: "intent",
    query,
    intent,
  });

  return response;
}
