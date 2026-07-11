import type { AgentWorkAgentName, AgentWorkItem, AgentWorkStatusConfig } from "./types";

export const AGENT_WORK_STATUS_CONFIG: AgentWorkStatusConfig[] = [
  { status: "queued", label: "Queued", emptyMessage: "No queued work." },
  { status: "active", label: "Active", emptyMessage: "No agent currently working." },
  { status: "blocked", label: "Blocked", emptyMessage: "No blocked work." },
  {
    status: "awaiting_approval",
    label: "Awaiting approval",
    emptyMessage: "Nothing waiting on an operator decision.",
  },
  { status: "completed", label: "Completed", emptyMessage: "No completed work yet this shift." },
];

export interface AgentDirectoryEntry {
  agent: AgentWorkAgentName;
  /** One-sentence, hardcoded description of what this agent does. */
  description: string;
  /**
   * Whether this agent has a real (non-mock) data source at all, even if it
   * currently has zero items. Used as the live/mock badge fallback when an
   * agent has no items to infer it from directly.
   */
  liveCapable: boolean;
}

/**
 * The full known agent roster for the Agents-tab overview and per-agent
 * lanes — every agent appears here regardless of whether it currently has
 * work items, so the tab is a coherent "all agents" view, not just a list
 * of whoever happens to have a card right now.
 */
export const AGENT_DIRECTORY: AgentDirectoryEntry[] = [
  {
    agent: "Roadmap Agent",
    description:
      "Turns Chief-approved planning proposals into vault notes and, once approved, build tasks.",
    liveCapable: true,
  },
  {
    agent: "Build Agent",
    description: "Tracks build-workflow tasks through their required gates from Planned to Done.",
    liveCapable: true,
  },
  {
    agent: "Librarian Agent",
    description: "Files Chief decisions to the Obsidian vault and the notes index.",
    liveCapable: true,
  },
  {
    agent: "Workflow Gate Agent",
    description: "Tracks non-build tasks against their required gate checklist.",
    liveCapable: true,
  },
  {
    agent: "Research Agent",
    description: "Surfaces open incidents by severity for review.",
    liveCapable: true,
  },
  {
    agent: "Marketer Agent",
    description: "Drafts marketing and content updates for review.",
    liveCapable: false,
  },
  {
    agent: "Competitive Research Agent",
    description: "Drafts competitive analysis and market scans.",
    liveCapable: false,
  },
];

// Mock only — see AgentWorkItem in types.ts for the extension point once
// agents report real status. Librarian and Roadmap (Planner) are now
// live-derived from runtime_work_items.
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [
  {
    id: "agentwork-marketer-1",
    agent: "Marketer Agent",
    task: "Draft homepage copy update for review",
    status: "completed",
    priority: "low",
    note: "Sent for content approval — see Approvals tab.",
    updatedAt: "2026-07-06T08:15:00.000Z",
    source: "mock",
  },
  {
    id: "agentwork-competitive-research-1",
    agent: "Competitive Research Agent",
    task: "Draft competitive analysis outline",
    status: "queued",
    priority: "medium",
    note: "Mock research agent work item — local only.",
    updatedAt: "2026-07-11T00:00:00.000Z",
    source: "mock",
  },
];
