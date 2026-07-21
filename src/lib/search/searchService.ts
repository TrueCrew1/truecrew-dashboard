import type { MockData } from "@/data/mockData";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  deriveResearchAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
  type ChiefLiveContext,
} from "@/components/chief/chiefLiveContext";
import { AGENT_WORK_ITEMS } from "@/components/chief/agentWorkBoardMock";
import { routeForTask, routeForWorkflowType } from "@/components/chief/chiefRoutes";
import type { AgentWorkItem, ApprovalProposal } from "@/components/chief/types";
import { WorkflowStage } from "@/types";
import type { EntitySearchResult, SearchResultGroup } from "./types";

export interface SearchContext {
  data: MockData;
  liveContext: ChiefLiveContext;
  approvals: ApprovalProposal[];
}

const MAX_RESULTS_PER_GROUP = 5;

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function queryTokens(query: string): string[] {
  return query.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Deterministic scorer — exact match beats prefix beats substring beats
 * "every query word appears somewhere in the field, in any order" (so
 * "rate limiter billing" still finds "Billing API rate limiter"). No fuzzy
 * matching/embedding library: the corpus here (mock data titles) is small
 * enough that this is sufficient and legible, and it's not purely a single
 * substring test — swap this for a real search index/vector search if the
 * data source grows past what deterministic scoring can carry.
 */
function scoreMatch(query: string, ...fields: (string | undefined)[]): number {
  const tokens = queryTokens(query);
  let best = -1;

  for (const field of fields) {
    if (!field) continue;
    const value = field.toLowerCase();
    if (value === query) best = Math.max(best, 100);
    else if (value.startsWith(query)) best = Math.max(best, 80);
    else if (value.includes(query)) best = Math.max(best, 50);
    else if (tokens.length > 1 && tokens.every((token) => value.includes(token))) {
      best = Math.max(best, 35);
    }
  }

  return best;
}

function topScored<T extends { score: number }>(rows: T[]): T[] {
  return rows
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_GROUP);
}

/**
 * All agent work, merged the same way AgentWorkBoard.tsx does, minus the two
 * sources that require React hooks (project-summary-handoff missions,
 * live-API decisions) — search runs outside a component so it only draws on
 * the plain-data derivations. Real for Build/Workflow Gate/Research/
 * Librarian/awaiting-approval; Roadmap and Marketer stay mock, same split
 * the Agents board already documents.
 */
function collectAgentWorkItems(ctx: SearchContext): AgentWorkItem[] {
  return [
    ...deriveBuildAgentWorkItems(ctx.data.tasks),
    ...deriveWorkflowGateAgentWorkItems(ctx.data.tasks),
    ...deriveResearchAgentWorkItems(ctx.data.incidents),
    ...deriveLibrarianAgentWorkItems(ctx.data.tasks, ctx.data.notes),
    ...deriveAgentAwaitingApprovalWorkItems(ctx.approvals),
    ...AGENT_WORK_ITEMS,
  ];
}

export function searchAgents(query: string, ctx: SearchContext): EntitySearchResult[] {
  const byAgent = new Map<string, AgentWorkItem[]>();
  for (const item of collectAgentWorkItems(ctx)) {
    const list = byAgent.get(item.agent) ?? [];
    list.push(item);
    byAgent.set(item.agent, list);
  }

  const rows = Array.from(byAgent.entries()).map(([agent, agentItems]) => {
    const taskText = agentItems.map((item) => item.task).join(" ");
    const score = scoreMatch(query, agent, taskText);
    const active = agentItems.filter((item) => item.status === "active" || item.status === "queued")
      .length;
    const blocked = agentItems.filter(
      (item) => item.status === "blocked" || item.status === "awaiting_approval",
    ).length;

    const result: EntitySearchResult = {
      id: `search-agent-${agent}`,
      kind: "agent",
      title: agent,
      subtitle: `${agentItems.length} item${agentItems.length === 1 ? "" : "s"} tracked${
        blocked > 0 ? ` · ${blocked} blocked/awaiting` : ""
      }`,
      meta: active > 0 ? `${active} active` : undefined,
      chiefTab: "agents",
      chiefFilter: agent,
    };

    return { ...result, score };
  });

  return topScored(rows);
}

export function searchProjects(query: string, ctx: SearchContext): EntitySearchResult[] {
  const rows = ctx.data.workflows.map((workflow) => ({
    score: scoreMatch(query, workflow.title, workflow.summary, workflow.type),
    result: {
      id: `search-project-${workflow.id}`,
      kind: "project" as const,
      title: workflow.title,
      subtitle: `${workflow.type} · ${workflow.stage}`,
      route: routeForWorkflowType(workflow.type),
      entityId: workflow.id,
    },
  }));

  return topScored(rows.map((row) => ({ ...row.result, score: row.score })));
}

export function searchTasks(query: string, ctx: SearchContext): EntitySearchResult[] {
  const rows = ctx.data.tasks.map((task) => ({
    score: scoreMatch(query, task.title, task.description),
    result: {
      id: `search-task-${task.id}`,
      kind: "task" as const,
      title: task.title,
      subtitle: `${task.workflowType} · ${task.stage} · ${task.priority} priority`,
      route: routeForTask(task),
      entityId: task.id,
    },
  }));

  return topScored(rows.map((row) => ({ ...row.result, score: row.score })));
}

const CONTINUE_WORK_PATTERN =
  /^(?:continue|resume)(?:\s+(?:my|the|previous))*\s+work(?:\s+on)?\s+(.+)$/i;

const ACTIVE_TASK_STAGES: ReadonlySet<WorkflowStage> = new Set([
  WorkflowStage.InProgress,
  WorkflowStage.Waiting,
  WorkflowStage.Review,
]);

/** Recognizes "continue/resume [previous/my] work [on] X" — returns the topic, or null if the query isn't shaped like that. */
export function parseContinueWorkTopic(rawQuery: string): string | null {
  const match = rawQuery.trim().match(CONTINUE_WORK_PATTERN);
  const topic = match?.[1]?.trim();
  return topic ? topic : null;
}

/**
 * Real lookup, not a stub: matches `topic` against tasks still in an active
 * stage (In Progress / Waiting / Review), ranked by text match first and
 * recency (updatedAt) second — "continue previous work on QuickBooks"
 * should land on the most recently touched matching task, not just any
 * match. There's no separate "active work" data source in the app; this
 * reads the same `data.tasks` every other task search reads.
 */
export function searchContinueWork(topic: string, ctx: SearchContext): EntitySearchResult[] {
  const query = normalizeQuery(topic);
  if (!query) return [];

  const rows = ctx.data.tasks
    .filter((task) => ACTIVE_TASK_STAGES.has(task.stage))
    .map((task) => ({ task, score: scoreMatch(query, task.title, task.description) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.task.updatedAt).getTime() - new Date(a.task.updatedAt).getTime();
    })
    .slice(0, MAX_RESULTS_PER_GROUP);

  return rows.map(({ task }) => ({
    id: `search-continue-${task.id}`,
    kind: "task" as const,
    title: task.title,
    subtitle: `Continue · ${task.workflowType} · ${task.stage} · updated ${new Date(
      task.updatedAt,
    ).toLocaleDateString()}`,
    route: routeForTask(task),
    entityId: task.id,
  }));
}

export function searchDocuments(query: string, ctx: SearchContext): EntitySearchResult[] {
  const candidates = [
    ...ctx.data.notes.map((note) => ({
      id: `note-${note.id}`,
      title: note.title,
      subtitle: `Note · ${note.type}`,
      searchable: [note.title, note.summary, ...(note.tags ?? [])],
    })),
    ...ctx.data.runbooks.map((runbook) => ({
      id: `runbook-${runbook.id}`,
      title: runbook.title,
      subtitle: `Runbook · ${runbook.serviceName}`,
      searchable: [runbook.title, runbook.summary, ...runbook.tags],
    })),
    ...ctx.data.prompts.map((prompt) => ({
      id: `prompt-${prompt.id}`,
      title: prompt.title,
      subtitle: `Prompt · ${prompt.category}`,
      searchable: [prompt.title, prompt.content, ...prompt.tags],
    })),
  ];

  const rows = candidates.map((candidate) => ({
    score: scoreMatch(query, ...candidate.searchable),
    result: {
      id: `search-doc-${candidate.id}`,
      kind: "document" as const,
      title: candidate.title,
      subtitle: candidate.subtitle,
      route: "/knowledge",
    },
  }));

  return topScored(rows.map((row) => ({ ...row.result, score: row.score })));
}

/**
 * Real search over the app's actual in-memory state (MockData + Chief's
 * derived agent/approval data) — no network, but also no fabricated results.
 * Group order matches the product spec: Agents, Projects, Tasks, Documents.
 * Suggested actions are composed separately (see intentParser.ts) since they
 * come from parsing the query as an instruction, not from matching entities.
 */
export function searchEntities(rawQuery: string, ctx: SearchContext): SearchResultGroup[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const groups: SearchResultGroup[] = [];

  const continueWorkTopic = parseContinueWorkTopic(rawQuery);
  if (continueWorkTopic) {
    const continueWork = searchContinueWork(continueWorkTopic, ctx);
    if (continueWork.length > 0) {
      groups.push({ id: "continueWork", label: "Continue work", items: continueWork });
    }
  }

  const agents = searchAgents(query, ctx);
  if (agents.length > 0) groups.push({ id: "agents", label: "Agents", items: agents });

  const projects = searchProjects(query, ctx);
  if (projects.length > 0) groups.push({ id: "projects", label: "Projects", items: projects });

  const tasks = searchTasks(query, ctx);
  if (tasks.length > 0) groups.push({ id: "tasks", label: "Tasks", items: tasks });

  const documents = searchDocuments(query, ctx);
  if (documents.length > 0) {
    groups.push({ id: "documents", label: "Documents & notes", items: documents });
  }

  return groups;
}
