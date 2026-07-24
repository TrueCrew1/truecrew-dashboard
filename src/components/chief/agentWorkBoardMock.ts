import type { AgentWorkItem, AgentWorkStatusConfig } from "./types";

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

// Mock only — Marketer has no live workflow type yet. Roadmap is live-derived
// from decision tasks (deriveRoadmapAgentWorkItems). Shown only in mock + global.
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [
  {
    id: "agentwork-marketer-1",
    agent: "Marketer Agent",
    task: "Draft homepage copy update for review",
    status: "completed",
    priority: "low",
    note: "Sent for content approval — see Approvals tab.",
    updatedAt: "2026-07-06T08:15:00.000Z",
  },
];
