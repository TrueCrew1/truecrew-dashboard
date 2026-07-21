import type { ActionSearchResult } from "./types";

interface RouteDef {
  path: string;
  label: string;
  keywords: string[];
}

/**
 * Mirrors Sidebar.tsx's nav items. Kept as a small static list rather than
 * importing the sidebar's config directly, since that config is JSX-shaped
 * (icons, badges) and this only needs path/label/keywords.
 */
const APP_ROUTES: RouteDef[] = [
  { path: "/", label: "Today", keywords: ["today", "home"] },
  { path: "/dashboard", label: "Dashboard", keywords: ["dashboard"] },
  { path: "/operations", label: "Operations", keywords: ["operations", "ops"] },
  { path: "/builds", label: "Builds", keywords: ["builds", "build"] },
  { path: "/monitor", label: "Monitor", keywords: ["monitor", "incidents", "incident", "uptime"] },
  { path: "/repair", label: "Repair", keywords: ["repair"] },
  { path: "/customers", label: "Customers", keywords: ["customers", "customer"] },
  {
    path: "/knowledge",
    label: "AI & Knowledge",
    // No dedicated Roadmap page exists yet — Roadmap Agent's output lives as
    // notes/runbooks, so "roadmap" queries route here rather than 404ing.
    keywords: ["knowledge", "notes", "runbooks", "prompts", "roadmap"],
  },
  { path: "/review", label: "Review", keywords: ["review", "deploys", "deploy"] },
  { path: "/settings", label: "Settings", keywords: ["settings"] },
];

function extractAfter(pattern: RegExp, text: string): string | null {
  const match = text.match(pattern);
  const captured = match?.[1]?.trim();
  return captured ? captured : null;
}

function findRouteFor(text: string): RouteDef | undefined {
  const lower = text.toLowerCase();
  return APP_ROUTES.find((route) => route.keywords.some((keyword) => lower.includes(keyword)));
}

/**
 * Deterministic, regex-based intent detection — not an AI call. This is the
 * mock/fallback boundary called out in the brief: swap this module for a
 * real query-interpretation model later without touching searchService.ts,
 * CommandBar.tsx, or the action-routing shapes in types.ts.
 */
export function buildSuggestedActions(rawQuery: string): ActionSearchResult[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const actions: ActionSearchResult[] = [];

  const researchTopic = extractAfter(
    /^(?:start|begin|kick off|do)\s+research\s+(?:on|into|about)\s+(.+)$/i,
    query,
  );
  if (researchTopic) {
    actions.push({
      id: "action-start-research",
      kind: "action",
      title: `Start research on "${researchTopic}"`,
      subtitle: "Routes to Chief, who assigns Research or Librarian",
      action: { type: "run_chief_command", command: `research ${researchTopic}`, target: "chief" },
    });
  }

  const openTarget = extractAfter(/^open\s+(.+)$/i, query);
  if (openTarget) {
    const match = findRouteFor(openTarget);
    if (match) {
      actions.push({
        id: `action-open-${match.path}`,
        kind: "action",
        title: `Open ${match.label}`,
        action: { type: "navigate", path: match.path },
      });
    }
  }

  const agentsTopic =
    extractAfter(/^show\s+agents?\s+(?:working on|on|for)\s+(.+)$/i, query) ??
    extractAfter(/^who(?:'s|s| is)?\s+working on\s+(.+)$/i, query);
  if (agentsTopic) {
    actions.push({
      id: "action-show-agents",
      kind: "action",
      title: `Show agents working on "${agentsTopic}"`,
      subtitle: "Opens Chief · Agents, filtered to this",
      action: { type: "open_chief_tab", tab: "agents", filter: agentsTopic },
    });
  }

  const assignMatch = query.match(/^assign\s+(.+?)\s+to\s+(chief|ecosystem)\b/i);
  if (assignMatch) {
    const [, task, targetRaw] = assignMatch;
    const target = targetRaw.toLowerCase() === "chief" ? "chief" : "ecosystem";
    actions.push({
      id: `action-assign-${target}`,
      kind: "action",
      title: `Assign "${task.trim()}" to ${target === "chief" ? "Chief" : "the ecosystem"}`,
      subtitle:
        target === "chief"
          ? "Chief evaluates it and decides or escalates for approval"
          : "Chief routes it to a specialist and it shows up on the Agents board",
      action: { type: "run_chief_command", command: task.trim(), target },
    });
  }

  // There is no task-creation write path anywhere in this app yet (the
  // TopBar "+ Quick create" button is itself an unwired stub) — rather than
  // fabricate one, this hands the request to Chief for triage, the same
  // advisory-only path every other command goes through.
  const newTaskText =
    extractAfter(/^create\s+(?:a\s+)?task\s*(?:for|:)?\s*(.+)$/i, query) ??
    extractAfter(/^new\s+task\s*(?:for|:)?\s*(.+)$/i, query);
  if (newTaskText) {
    actions.push({
      id: "action-create-task",
      kind: "action",
      title: `Create task: "${newTaskText}"`,
      subtitle: "No task-creation write path exists yet — routes to Chief for triage instead",
      action: { type: "run_chief_command", command: `new task: ${newTaskText}`, target: "chief" },
    });
  }

  // A bare route keyword ("monitor", "settings") without an explicit "open" verb.
  if (!openTarget) {
    const directRoute = findRouteFor(query);
    if (directRoute && !actions.some((action) => action.action.type === "navigate")) {
      actions.push({
        id: `action-goto-${directRoute.path}`,
        kind: "action",
        title: `Open ${directRoute.label}`,
        action: { type: "navigate", path: directRoute.path },
      });
    }
  }

  // Sentence-like queries (3+ words) always get a way to hand the raw text
  // straight to Chief, even with no other match — that's the "instruction,
  // not a lookup" case. Short queries (1-2 words) that match nothing are
  // left with no suggested actions at all, so a genuine typo/no-match can
  // still surface the no-results state instead of a low-value "Ask Chief"
  // suggestion on every stray keyword.
  if (query.split(/\s+/).length > 2) {
    actions.push({
      id: "action-ask-chief",
      kind: "action",
      title: `Ask Chief: "${query}"`,
      subtitle: "Runs this as a Chief command",
      action: { type: "run_chief_command", command: query, target: "chief" },
    });
  }

  return actions.slice(0, 4);
}
