import type { SearchResult, SearchResultGroup, SearchResultType } from "./types";

const GROUP_LABELS: Record<SearchResultType, string> = {
  project: "Projects",
  agent: "Agents",
  task: "Tasks",
  document: "Documents",
  customer: "Customers",
  workflow: "Workflows",
  focus_item: "Active work",
  research_request: "Research",
  approval: "Approvals",
  action: "Suggested actions",
};

const GROUP_ORDER: SearchResultType[] = [
  "action",
  "focus_item",
  "approval",
  "task",
  "project",
  "agent",
  "document",
  "research_request",
  "customer",
  "workflow",
];

export function rankResults(results: SearchResult[], limitPerGroup = 5): SearchResultGroup[] {
  const byType = new Map<SearchResultType, SearchResult[]>();

  for (const result of [...results].sort((a, b) => b.score - a.score)) {
    const bucket = byType.get(result.type) ?? [];
    if (bucket.length >= limitPerGroup) continue;
    bucket.push(result);
    byType.set(result.type, bucket);
  }

  return GROUP_ORDER.filter((type) => (byType.get(type)?.length ?? 0) > 0).map((type) => ({
    type,
    label: GROUP_LABELS[type],
    results: byType.get(type) ?? [],
  }));
}

export function flattenGroups(groups: SearchResultGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}

export function topResult(groups: SearchResultGroup[]): SearchResult | undefined {
  return flattenGroups(groups)[0];
}
