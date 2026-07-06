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
// agents report real status.
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [
  {
    id: "agentwork-wg-1",
    agent: "Workflow Gate Agent",
    task: "Scan open build gates for stale required checks",
    status: "active",
    priority: "high",
    note: "Flag any task still gated after 30 min without a status change.",
    updatedAt: "2026-07-06T13:12:00.000Z",
  },
  {
    id: "agentwork-wg-2",
    agent: "Workflow Gate Agent",
    task: "Re-check onboarding checklist gates for waiting customers",
    status: "queued",
    priority: "medium",
    note: "Runs on the next onboarding-stage poll.",
    updatedAt: "2026-07-06T07:50:00.000Z",
  },
  {
    id: "agentwork-research-1",
    agent: "Research Agent",
    task: "Correlate open Sev 1–2 incidents with recent deploys",
    status: "blocked",
    priority: "high",
    note: "Deploy history for one service is missing service tags.",
    updatedAt: "2026-07-06T11:55:00.000Z",
  },
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
