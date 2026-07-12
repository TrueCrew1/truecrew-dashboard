import type { Task } from "@/types";
import type { PlannerWorkItem } from "@/types/plannerWorkItems";
import {
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  derivePlannerAgentWorkItems,
  derivePlannerReadyBuildWorkItems,
} from "./chiefLiveContext";
import { AGENT_WORK_ITEMS } from "./agentWorkBoardMock";
import type { AgentWorkAgentName, AgentWorkItem, AgentWorkStatus } from "./types";

/** AgentWorkStatus plus "created" — the one event type with no AgentWorkStatus equivalent. */
export type AgentActivityType = AgentWorkStatus | "created";

export interface AgentActivityItem {
  id: string;
  agent: AgentWorkAgentName;
  activityType: AgentActivityType;
  description: string;
  timestamp: string;
  source: "live" | "mock";
}

const STATUS_VERB: Record<AgentWorkStatus, string> = {
  queued: "queued",
  active: "started",
  blocked: "blocked on",
  awaiting_approval: "awaiting approval for",
  completed: "completed",
};

function describeWorkItem(item: AgentWorkItem): string {
  return `${item.agent} ${STATUS_VERB[item.status]}: ${item.task}`;
}

function fromWorkItems(items: AgentWorkItem[]): AgentActivityItem[] {
  return items.map((item) => ({
    id: `activity-${item.id}`,
    agent: item.agent,
    activityType: item.status,
    description: describeWorkItem(item),
    timestamp: item.updatedAt,
    source: item.source ?? "mock",
  }));
}

function buildTaskCreatedActivity(task: Task): AgentActivityItem {
  return {
    id: `activity-build-created-${task.id}`,
    agent: "Build Agent",
    activityType: "created",
    description: `Build Agent created task: ${task.title}`,
    timestamp: task.createdAt,
    source: "live",
  };
}

/**
 * Chronological (newest-first) agent activity feed, built entirely from
 * data the Agents-tab derivers already trust — no new data source. Every
 * build task always gets a "created" event (task.createdAt); it also gets
 * a current-status event (task.updatedAt) only once something has actually
 * changed since creation, so an untouched task doesn't show two
 * near-identical rows at the same timestamp.
 */
export function deriveAgentActivityTimeline(input: {
  tasks: Task[];
  plannerWorkItems: Parameters<typeof derivePlannerAgentWorkItems>[0];
  plannerReadyBuildWorkItems: PlannerWorkItem[];
  librarianWorkItems: Parameters<typeof deriveLibrarianAgentWorkItems>[0];
  mockItems?: AgentWorkItem[];
}): AgentActivityItem[] {
  const buildTasks = input.tasks.filter((task) => task.workflowType === "build");
  const changedBuildTasks = buildTasks.filter((task) => task.updatedAt !== task.createdAt);

  const events: AgentActivityItem[] = [
    ...buildTasks.map(buildTaskCreatedActivity),
    ...fromWorkItems(deriveBuildAgentWorkItems(changedBuildTasks)),
    ...fromWorkItems(derivePlannerReadyBuildWorkItems(input.plannerReadyBuildWorkItems)),
    ...fromWorkItems(derivePlannerAgentWorkItems(input.plannerWorkItems)),
    ...fromWorkItems(deriveLibrarianAgentWorkItems(input.librarianWorkItems)),
    ...fromWorkItems(input.mockItems ?? AGENT_WORK_ITEMS),
  ];

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const DEFAULT_RECENT_ACTIVITY_LIMIT = 15;

/**
 * One agent's slice of an already newest-first activity feed, capped so the
 * detail drawer shows "recent" activity rather than an unbounded history.
 */
export function recentActivityForAgent(
  activity: AgentActivityItem[],
  agent: AgentWorkAgentName,
  limit: number = DEFAULT_RECENT_ACTIVITY_LIMIT,
): AgentActivityItem[] {
  return activity.filter((item) => item.agent === agent).slice(0, limit);
}
