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

// Mock only — see AgentWorkItem in types.ts for the extension point once
// agents report real status. Workflow Gate Agent's and Research Agent's
// entries used to live here too; both are now derived from real data (see
// deriveWorkflowGateAgentWorkItems and deriveResearchAgentWorkItems in
// chiefLiveContext.ts), same as Build.
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [
  {
    id: "agentwork-librarian-1",
    agent: "Librarian Agent",
    task: "Refresh knowledge index against latest runbooks and notes",
    status: "awaiting_approval",
    priority: "low",
    note: "Two runbooks have conflicting steps — needs an operator call.",
    updatedAt: "2026-07-06T12:40:00.000Z",
  },
  {
    id: "agentwork-roadmap-1",
    agent: "Roadmap Agent",
    task: "Draft next roadmap phase scope note",
    status: "queued",
    priority: "medium",
    note: "Starts once the current phase's approval clears.",
    updatedAt: "2026-07-06T09:30:00.000Z",
  },
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
