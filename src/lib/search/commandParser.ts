import { normalizeQuery, phraseAfter, tokenizeQuery } from "./normalize";
import type { CommandIntent, SearchResultType } from "./types";

const CHIEF_QUERY_PATTERNS = [
  /\b(approv|approval)\b/i,
  /\b(block|blocking|blocked|gate|gates|stuck|deploy)\b/i,
  /\b(risk|at risk|today|status|overview|focus)\b/i,
  /\b(incident|monitor|sev|uptime|degrad)\b/i,
  /\b(alert|alerts|feed|notify|notification)\b/i,
  /\b(missing|without|no)\b.*\b(customer|job|context)\b/i,
  /\b(customer|job|context)\b.*\b(missing|gap|unlinked|link)\b/i,
];

function baseIntent(rawQuery: string, partial: Partial<CommandIntent>): CommandIntent {
  return {
    mode: "search",
    rawQuery,
    searchQuery: rawQuery,
    confidence: 0.4,
    reason: "Default search interpretation",
    ...partial,
  };
}

function extractTopic(rawQuery: string, pattern: RegExp): string {
  return phraseAfter(rawQuery, pattern);
}

/**
 * Topic from an explicit research command — "start research on X",
 * "start research X", "research X", "research on X" — or null when the input
 * isn't a research command or names no topic. Shared by parseCommand and
 * Chief's research bridge so both surfaces accept the same command forms.
 */
export function extractResearchTopic(input: string): string | null {
  const rawQuery = normalizeQuery(input);
  if (!/^(?:start\s+)?research\b/i.test(rawQuery)) return null;
  const topic =
    extractTopic(rawQuery, /^start\s+research(?:\s+on)?\s+/i) ||
    extractTopic(rawQuery, /^research(?:\s+on)?\s+/i);
  return topic || null;
}

function resolveAssignmentTarget(rawQuery: string): CommandIntent["assignmentTarget"] {
  if (/\bchief\b/i.test(rawQuery)) return "chief";
  if (/\becosystem\b/i.test(rawQuery)) return "ecosystem";
  if (/\bresearch agent\b/i.test(rawQuery)) return "Research Agent";
  if (/\bworkflow gate agent\b/i.test(rawQuery)) return "Workflow Gate Agent";
  if (/\blibrarian agent\b/i.test(rawQuery)) return "Librarian Agent";
  if (/\broadmap agent\b/i.test(rawQuery)) return "Roadmap Agent";
  if (/\bbuild agent\b/i.test(rawQuery)) return "Build Agent";
  return "ecosystem";
}

function isChiefOpsQuery(rawQuery: string): boolean {
  return CHIEF_QUERY_PATTERNS.some((pattern) => pattern.test(rawQuery));
}

export function parseCommand(input: string): CommandIntent {
  const rawQuery = normalizeQuery(input);
  if (!rawQuery) {
    return baseIntent("", { confidence: 0, reason: "Empty query" });
  }

  if (/^assign\b/i.test(rawQuery)) {
    const targetPhrase = extractTopic(rawQuery, /^assign\s+(.+?)\s+to\s+/i) || rawQuery;
    const assignmentTarget = resolveAssignmentTarget(rawQuery);
    return {
      mode: "action",
      rawQuery,
      searchQuery: targetPhrase,
      action: "assign_agent",
      assignmentTarget,
      target: { label: targetPhrase, phrase: targetPhrase },
      confidence: 0.9,
      reason: `Assignment routed to ${assignmentTarget}`,
    };
  }

  // Both "start research on X" and short-form "research X" are explicit
  // commands; a bare "research" with no topic falls through to plain search.
  const researchTopic = extractResearchTopic(rawQuery);
  if (researchTopic) {
    return {
      mode: "action",
      rawQuery,
      searchQuery: researchTopic,
      action: "start_research",
      assignmentTarget: "ecosystem",
      topic: researchTopic,
      target: { label: researchTopic, phrase: researchTopic },
      confidence: 0.92,
      reason: "Explicit research start command",
    };
  }

  if (/^continue\b/i.test(rawQuery) || /\bcontinue\s+(?:previous\s+)?work\b/i.test(rawQuery)) {
    const topic =
      extractTopic(rawQuery, /^continue(?:\s+previous\s+work)?(?:\s+on)?\s+/i) ||
      extractTopic(rawQuery, /\bwork\s+on\s+(.+)$/i) ||
      rawQuery;
    return {
      mode: "action",
      rawQuery,
      searchQuery: topic,
      action: "continue_work",
      assignmentTarget: "chief",
      topic,
      target: { label: topic, phrase: topic },
      confidence: 0.88,
      reason: "Resume active work command",
    };
  }

  if (/^open\b/i.test(rawQuery)) {
    const phrase = extractTopic(rawQuery, /^open\s+/i) || rawQuery;
    const entityType: SearchResultType | undefined = /\broadmap\b/i.test(phrase)
      ? "project"
      : /\bagent/i.test(phrase)
        ? "agent"
        : /\btask\b/i.test(phrase)
          ? "task"
          : undefined;
    return {
      mode: "action",
      rawQuery,
      searchQuery: phrase,
      action: "open_entity",
      target: { label: phrase, phrase, entityType },
      confidence: 0.86,
      reason: "Explicit open command",
    };
  }

  if (/^create\s+task\b/i.test(rawQuery)) {
    const title = extractTopic(rawQuery, /^create\s+task(?:\s+for)?\s+/i) || "New task";
    return {
      mode: "action",
      rawQuery,
      searchQuery: title,
      action: "create_task",
      assignmentTarget: "chief",
      target: { label: title, phrase: title, entityType: "task" },
      confidence: 0.9,
      reason: "Explicit task creation command",
    };
  }

  if (/^route\b.+\bto\s+chief\b/i.test(rawQuery)) {
    const phrase = extractTopic(rawQuery, /^route\s+(.+?)\s+to\s+chief\b/i) || rawQuery;
    return {
      mode: "action",
      rawQuery,
      searchQuery: phrase,
      action: "route_to_chief",
      assignmentTarget: "chief",
      target: { label: phrase, phrase },
      confidence: 0.9,
      reason: "Explicit Chief routing command",
    };
  }

  if (/^route\b.+\bto\s+ecosystem\b/i.test(rawQuery) || /\bassign\b.+\bto\s+ecosystem\b/i.test(rawQuery)) {
    const phrase = extractTopic(rawQuery, /^(?:route|assign)\s+(.+?)\s+to\s+ecosystem\b/i) || rawQuery;
    return {
      mode: "action",
      rawQuery,
      searchQuery: phrase,
      action: "route_to_ecosystem",
      assignmentTarget: "ecosystem",
      target: { label: phrase, phrase },
      confidence: 0.9,
      reason: "Explicit ecosystem routing command",
    };
  }

  if (/\bshow\s+agents\b/i.test(rawQuery) || /\bagents?\s+working\b/i.test(rawQuery)) {
    const projectSlug = tokenizeQuery(rawQuery).find((term) =>
      ["ms-painting", "mspainting", "quickbooks", "billing"].includes(term),
    );
    return {
      mode: "search",
      rawQuery,
      searchQuery: rawQuery,
      filters: {
        types: ["agent", "task", "project"],
        projectSlug,
      },
      confidence: 0.8,
      reason: "Agent activity lookup",
    };
  }

  if (isChiefOpsQuery(rawQuery)) {
    return {
      mode: "chief_query",
      rawQuery,
      searchQuery: rawQuery,
      action: "chief_query",
      assignmentTarget: "chief",
      confidence: 0.85,
      reason: "Operational Chief query",
    };
  }

  return baseIntent(rawQuery, {
    confidence: 0.55,
    reason: "Free-text entity search",
  });
}

export function resolveIntent(input: string): CommandIntent {
  return parseCommand(input);
}

export function resolveTarget(intent: CommandIntent): string {
  return intent.target?.phrase ?? intent.topic ?? intent.searchQuery;
}
